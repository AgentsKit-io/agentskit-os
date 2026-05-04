/// Multi-monitor window management commands (D-12).
///
/// Exposes three Tauri invoke commands:
///   - `list_monitors`       — enumerate connected displays.
///   - `open_window`         — open (or focus) a purpose-scoped webview window.
///   - `close_window`        — close a purpose-scoped webview window.
///   - `save_window_layout`  — persist window layout (emits event to front-end).
///
/// A "purpose" is a stable string key such as `"dashboard"`, `"traces"`, or
/// `"trace-detail"`.  Each purpose maps to exactly one window at a time;
/// calling `open_window` a second time for the same purpose focuses the
/// existing window rather than creating a duplicate.
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

// ---------------------------------------------------------------------------
// Types exposed to the front-end via IPC
// ---------------------------------------------------------------------------

/// Information about a connected monitor.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    /// Opaque stable identifier (index-based for Tauri 2).
    pub id: String,
    /// Human-readable name supplied by the OS (e.g. "Built-in Retina Display").
    pub name: String,
    /// Top-left X position in logical pixels.
    pub x: i32,
    /// Top-left Y position in logical pixels.
    pub y: i32,
    /// Width in logical pixels.
    pub width: u32,
    /// Height in logical pixels.
    pub height: u32,
    /// Device-pixel ratio (scale factor).
    pub scale_factor: f64,
}

/// Arguments for `open_window`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWindowArgs {
    /// Stable purpose key (e.g. `"dashboard"`, `"traces"`, `"trace-detail"`).
    pub purpose: String,
    /// Optional monitor id to position the window on.  When absent the window
    /// is placed on the same monitor as the main window.
    pub monitor_id: Option<String>,
}

/// Arguments for `save_window_layout`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowLayoutArgs {
    pub purpose: String,
    pub monitor_id: String,
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// List all connected monitors.
///
/// Returns an empty list when the Tauri window manager cannot enumerate
/// monitors (e.g. during unit tests).
#[tauri::command]
pub fn list_monitors<R: Runtime>(app: AppHandle<R>) -> Vec<MonitorInfo> {
    // Tauri 2: monitors are accessible via any managed window handle.
    let Some(main_window) = app.get_webview_window("main") else {
        return vec![];
    };

    let monitors = match main_window.available_monitors() {
        Ok(m) => m,
        Err(_) => return vec![],
    };

    monitors
        .into_iter()
        .enumerate()
        .map(|(idx, m)| {
            let pos = m.position();
            let size = m.size();
            MonitorInfo {
                id: idx.to_string(),
                name: m.name().cloned().unwrap_or_else(|| format!("Display {}", idx + 1)),
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
                scale_factor: m.scale_factor(),
            }
        })
        .collect()
}

/// Open a webview window scoped to `purpose`, optionally on a specific monitor.
///
/// If a window with label `secondary-<purpose>` already exists it is surfaced
/// (shown + focused) instead of creating a new one.
#[tauri::command]
pub fn open_window<R: Runtime>(
    app: AppHandle<R>,
    args: OpenWindowArgs,
) -> Result<(), String> {
    let label = format!("secondary-{}", sanitise_label(&args.purpose));
    let encoded_purpose = urlencoded(&args.purpose);
    let url_str = format!("/?screen={encoded_purpose}");

    // De-duplicate: focus if the window already exists.
    if let Some(existing) = app.get_webview_window(&label) {
        existing.show().map_err(|e| e.to_string())?;
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Determine the monitor to place the window on.
    let (x, y) = resolve_window_position(&app, args.monitor_id.as_deref());

    // Build the webview URL as an app-relative path.
    let webview_url = WebviewUrl::App(std::path::PathBuf::from(url_str));

    WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(window_title(&args.purpose))
        .inner_size(1024.0, 768.0)
        .position(x, y)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Close a window scoped to `purpose`.
#[tauri::command]
pub fn close_window<R: Runtime>(
    app: AppHandle<R>,
    purpose: String,
) -> Result<(), String> {
    let label = format!("secondary-{}", sanitise_label(&purpose));
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Emit a `windows://layout-saved` event so the front-end can persist the
/// layout to localStorage.
#[tauri::command]
pub fn save_window_layout<R: Runtime>(
    app: AppHandle<R>,
    layout: WindowLayoutArgs,
) -> Result<(), String> {
    app.emit("windows://layout-saved", &layout)
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Strip characters that are illegal in Tauri window labels.
fn sanitise_label(purpose: &str) -> String {
    purpose
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect()
}

/// Percent-encode a purpose string for use in a URL query parameter.
fn urlencoded(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

/// Compute a window title from the purpose key.
fn window_title(purpose: &str) -> String {
    let word = purpose
        .split(['-', '_'])
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");
    format!("AgentsKitOS — {word}")
}

/// Return the logical (x, y) position where a new window should appear on the
/// requested monitor.  Falls back to a small offset from (0, 0) if the
/// monitor cannot be resolved.
fn resolve_window_position<R: Runtime>(
    app: &AppHandle<R>,
    monitor_id: Option<&str>,
) -> (f64, f64) {
    let Some(main_window) = app.get_webview_window("main") else {
        return (100.0, 100.0);
    };

    let Ok(monitors) = main_window.available_monitors() else {
        return (100.0, 100.0);
    };

    if monitors.is_empty() {
        return (100.0, 100.0);
    }

    // If a specific monitor was requested, try to find it by index.
    let target = monitor_id
        .and_then(|id| id.parse::<usize>().ok())
        .and_then(|idx| monitors.get(idx))
        .or_else(|| monitors.first());

    match target {
        Some(m) => {
            let pos = m.position();
            // Offset slightly from the monitor's top-left corner.
            (pos.x as f64 + 40.0, pos.y as f64 + 40.0)
        }
        None => (100.0, 100.0),
    }
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitise_label_strips_illegal_chars() {
        assert_eq!(sanitise_label("dashboard"), "dashboard");
        assert_eq!(sanitise_label("trace detail"), "trace-detail");
        assert_eq!(sanitise_label("a!b@c"), "a-b-c");
    }

    #[test]
    fn urlencoded_safe_chars_pass_through() {
        assert_eq!(urlencoded("dashboard"), "dashboard");
        assert_eq!(urlencoded("trace-detail"), "trace-detail");
    }

    #[test]
    fn urlencoded_spaces_encoded() {
        let encoded = urlencoded("my screen");
        assert!(encoded.contains("%20"), "space should be percent-encoded");
    }

    #[test]
    fn window_title_capitalises_purpose() {
        assert_eq!(window_title("dashboard"), "AgentsKitOS — Dashboard");
        assert_eq!(window_title("trace-detail"), "AgentsKitOS — Trace Detail");
    }

    #[test]
    fn monitor_info_serialises_to_camel_case() {
        let info = MonitorInfo {
            id: "0".into(),
            name: "Test Monitor".into(),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            scale_factor: 1.0,
        };
        let json = serde_json::to_string(&info).expect("serialisation failed");
        assert!(json.contains("scaleFactor"), "should use camelCase for scale_factor");
        assert!(json.contains("\"id\""), "should include id field");
    }
}
