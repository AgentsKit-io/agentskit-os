export const isDueWithinMs = (iso: string, windowMs: number): boolean => {
  const t = new Date(iso).getTime()
  const now = Date.now()
  return t > now && t - now < windowMs
}

export const compareIsoAsc = (aIso: string, bIso: string): number => {
  return new Date(aIso).getTime() - new Date(bIso).getTime()
}

export const compareIsoDesc = (aIso: string, bIso: string): number => {
  return new Date(bIso).getTime() - new Date(aIso).getTime()
}

