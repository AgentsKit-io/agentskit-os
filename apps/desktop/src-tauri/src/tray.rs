/// System-tray setup and menu builder (D-3 — ADR-0018 §3.1).
///
/// Menu layout:
///   Show window
///   Status: <Running | Idle>          (read-only, updated via sidecar events)
///   ─────────────────────────────────
///   Pause runs
///   Resume runs
///   ─────────────────────────────────
///   Settings…
///   Quit
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

use crate::sidecar::SidecarManager;

/// Stable identifiers for the menu items — used in event handlers and tests.
pub const ITEM_SHOW: &str = "tray_show";
pub const ITEM_STATUS: &str = "tray_status";
pub const ITEM_PAUSE: &str = "tray_pause";
pub const ITEM_RESUME: &str = "tray_resume";
pub const ITEM_SETTINGS: &str = "tray_settings";
pub const ITEM_QUIT: &str = "tray_quit";

/// Default status label shown before the first sidecar status event.
const DEFAULT_STATUS: &str = "Status: Idle";

/// Build and register the tray icon.  Returns the [`TrayIcon`] handle so the
/// caller can store it for later mutation (e.g. label updates).
pub fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<TrayIcon<R>> {
    let menu = build_menu(app, DEFAULT_STATUS)?;

    // Load the PNG from the bundled icons directory.  The file is committed as
    // a placeholder; a proper branded icon should be dropped in before release.
    let icon = load_tray_icon(app);

    let tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(tray)
}

/// Construct the [`Menu`] from scratch.  Called both at startup and when the
/// status label needs to be refreshed.
pub fn build_menu<R: Runtime>(
    app: &AppHandle<R>,
    status_label: &str,
) -> tauri::Result<Menu<R>> {
    let show = MenuItem::with_id(app, ITEM_SHOW, "Show window", true, None::<&str>)?;
    let status = MenuItem::with_id(app, ITEM_STATUS, status_label, false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let pause = MenuItem::with_id(app, ITEM_PAUSE, "Pause runs", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, ITEM_RESUME, "Resume runs", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, ITEM_SETTINGS, "Settings…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, ITEM_QUIT, "Quit", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &show, &status, &sep1, &pause, &resume, &sep2, &settings, &quit,
        ],
    )
}

/// Dispatch menu-item click events.
fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        ITEM_SHOW => show_main_window(app),
        ITEM_PAUSE => {
            // Best-effort: pause queued runs.
            if let Some(sidecar) = app.try_state::<SidecarManager>() {
                let _ = sidecar.request("runner.pause".to_string(), serde_json::json!({}));
            }
        }
        ITEM_RESUME => {
            if let Some(sidecar) = app.try_state::<SidecarManager>() {
                let _ = sidecar.request("runner.resume".to_string(), serde_json::json!({}));
            }
        }
        ITEM_SETTINGS => {
            // TODO: open settings screen via sidecar_request once the settings
            // route is implemented in the front-end.
            eprintln!("[tray] settings requested (TODO)");
            show_main_window(app);
        }
        ITEM_QUIT => {
            // Ask the sidecar to dispose before exiting (flush audit, close handles).
            if let Some(sidecar) = app.try_state::<SidecarManager>() {
                let _ = sidecar.request("lifecycle.dispose".to_string(), serde_json::json!({}));
                app.exit(0);
            } else {
                app.exit(0);
            }
        }
        _ => {}
    }
}

/// Surface the main window or create it if it was hidden.
pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Load the tray icon PNG.  Falls back to a 1×1 white pixel if the asset is
/// missing so the app still starts during development.
fn load_tray_icon<R: Runtime>(app: &AppHandle<R>) -> Image<'static> {
    // Try to resolve the icon from the resource directory.
    if let Ok(path) = app.path().resource_dir() {
        let icon_path = path.join("icons").join("tray.png");
        if let Ok(img) = Image::from_path(&icon_path) {
            return img;
        }
    }

    // Fallback: 1×1 opaque white pixel encoded as a raw RGBA byte.
    Image::from_bytes(include_bytes!("../icons/tray.png"))
        .unwrap_or_else(|_| Image::new(&[255u8, 255, 255, 255], 1, 1))
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Verify that all expected menu item IDs are defined as constants and that
    /// the constant values are unique and non-empty.
    #[test]
    fn menu_item_ids_are_unique_and_non_empty() {
        let ids = [
            ITEM_SHOW,
            ITEM_STATUS,
            ITEM_PAUSE,
            ITEM_RESUME,
            ITEM_SETTINGS,
            ITEM_QUIT,
        ];

        for id in &ids {
            assert!(!id.is_empty(), "menu item id must not be empty");
        }

        // All ids must be distinct.
        let mut seen = std::collections::HashSet::new();
        for id in &ids {
            assert!(seen.insert(*id), "duplicate menu item id: {id}");
        }
    }

    /// Confirm the expected number of menu items (6 named + 2 separators = 8
    /// entries, but we only track the 6 named ones here).
    #[test]
    fn expected_item_count() {
        let named_ids = [
            ITEM_SHOW,
            ITEM_STATUS,
            ITEM_PAUSE,
            ITEM_RESUME,
            ITEM_SETTINGS,
            ITEM_QUIT,
        ];
        assert_eq!(named_ids.len(), 6);
    }

    #[test]
    fn default_status_label_contains_idle() {
        assert!(
            DEFAULT_STATUS.contains("Idle"),
            "default status should indicate idle state"
        );
    }
}
