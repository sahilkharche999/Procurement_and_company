/**
 * Item type options shared by every type dropdown in the app.
 *
 * `item_types_config` in Mongo is the source of truth — the entries below are
 * the system defaults that always exist. They mirror SYSTEM_ITEM_TYPE_NAMES in
 * backend/services/settings/item_types_config_service.py, which also protects
 * them from being edited or deleted in Settings. Keep the two lists in sync.
 */
export const SYSTEM_ITEM_TYPE_NAMES = ["COM/COL", "FF&E", "OFCI"]

export const DEFAULT_ITEM_TYPE = "FF&E"

/**
 * Merge the configured item types with the system defaults, keeping the
 * record's own current type so a legacy or since-removed value is never lost.
 *
 * @param {Array<{name?: string}>} configuredItemTypes rows from /settings/item-types
 * @param {string} currentType the type already stored on the record being edited
 * @returns {string[]} de-duplicated option names, settings first
 */
export function buildItemTypeOptions(configuredItemTypes = [], currentType = "") {
  const fromSettings = (configuredItemTypes || [])
    .map((t) => String(t?.name || "").trim())
    .filter(Boolean)

  const merged = [...fromSettings, ...SYSTEM_ITEM_TYPE_NAMES]

  const current = String(currentType || "").trim()
  if (current) merged.push(current)

  return Array.from(new Set(merged))
}
