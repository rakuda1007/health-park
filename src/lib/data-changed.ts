/** クラウド同期・マージで IndexedDB が更新されたときに発火 */
export const HP_DATA_CHANGED = "hp-data-changed";

export function notifyHealthDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HP_DATA_CHANGED));
  }
}
