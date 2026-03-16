import type { Client } from "@libsql/client";
import { VISIT_CHECKLIST_CONFIG } from "@/domains/visit/constants";

/**
 * Seeds all default reference items from the visit checklist config.
 * Called once during DB initialization.
 * Equipment seeds are handled separately in client.ts (migrated from old table).
 */
export async function seedVisitReferenceItems(client: Client): Promise<void> {
  const config = VISIT_CHECKLIST_CONFIG;

  // ─── 1. Checklist items (base) ───────────────────
  let sortOrder = 0;
  for (const category of config.base_checklist) {
    for (const item of category.items) {
      const cfg = JSON.stringify({
        input_type: item.type,
        ...(item.hint ? { hint: item.hint } : {}),
        ...(item.options ? { options: item.options } : {}),
      });
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'checklist', ?, ?, ?, ?, ?, 1, ?)`,
          args: [`ri_cl_${item.key}`, item.key, item.label, category.icon, category.key, cfg, sortOrder++],
        });
      } catch { /* already exists */ }
    }
  }

  // ─── 2. Checklist items (conditional by amenity) ──
  for (const [amenityKey, items] of Object.entries(config.conditional_by_amenity)) {
    let amenitySortOrder = 0;
    for (const item of items) {
      const itemId = `ri_cl_${item.key}`;
      const condId = `rc_cl_${item.key}_amenity_${amenityKey}`;
      const cfg = JSON.stringify({
        input_type: item.type,
        ...(item.hint ? { hint: item.hint } : {}),
        ...(item.options ? { options: item.options } : {}),
      });
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'checklist', ?, ?, '🔍', 'amenity_specifics', ?, 1, ?)`,
          args: [itemId, item.key, item.label, cfg, amenitySortOrder++],
        });
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_conditions (id, item_id, condition_type, condition_value, sort_order)
                VALUES (?, ?, 'amenity', ?, ?)`,
          args: [condId, itemId, amenityKey, amenitySortOrder],
        });
      } catch { /* already exists */ }
    }
  }

  // ─── 3. Checklist items (conditional by type) ─────
  for (const [propType, items] of Object.entries(config.conditional_by_type)) {
    let typeSortOrder = 0;
    for (const item of items) {
      const itemId = `ri_cl_${item.key}`;
      const condId = `rc_cl_${item.key}_type_${propType}`;
      const cfg = JSON.stringify({
        input_type: item.type,
        ...(item.hint ? { hint: item.hint } : {}),
        ...(item.options ? { options: item.options } : {}),
      });
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'checklist', ?, ?, '🏚️', 'type_specifics', ?, 1, ?)`,
          args: [itemId, item.key, item.label, cfg, typeSortOrder++],
        });
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_conditions (id, item_id, condition_type, condition_value, sort_order)
                VALUES (?, ?, 'property_type', ?, ?)`,
          args: [condId, itemId, propType, typeSortOrder],
        });
      } catch { /* already exists */ }
    }
  }

  // ─── 4. Photo tags (base) ─────────────────────────
  sortOrder = 0;
  for (const tag of config.photo_tags_base) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
              VALUES (?, 'photo_tag', ?, ?, ?, 'base', '{}', 1, ?)`,
        args: [`ri_pt_${tag.key}`, tag.key, tag.label, tag.icon, sortOrder++],
      });
    } catch { /* already exists */ }
  }

  // ─── 5. Photo tags (conditional by amenity) ───────
  for (const [amenityKey, tags] of Object.entries(config.photo_tags_by_amenity)) {
    let amenitySortOrder = 0;
    for (const tag of tags) {
      const itemId = `ri_pt_${tag.key}`;
      const condId = `rc_pt_${tag.key}_amenity_${amenityKey}`;
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'photo_tag', ?, ?, ?, 'amenity', '{}', 1, ?)`,
          args: [itemId, tag.key, tag.label, tag.icon, amenitySortOrder++],
        });
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_conditions (id, item_id, condition_type, condition_value, sort_order)
                VALUES (?, ?, 'amenity', ?, ?)`,
          args: [condId, itemId, amenityKey, amenitySortOrder],
        });
      } catch { /* already exists */ }
    }
  }

  // ─── 6. Red flags ─────────────────────────────────
  sortOrder = 0;
  for (const flag of config.red_flags) {
    const cfg = JSON.stringify({
      severity: flag.severity,
      ...(flag.hint ? { hint: flag.hint } : {}),
    });
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
              VALUES (?, 'red_flag', ?, ?, ?, ?, ?, 1, ?)`,
        args: [
          `ri_rf_${flag.key}`,
          flag.key,
          flag.label,
          flag.severity === "critical" ? "🔴" : "🟡",
          flag.severity,
          cfg,
          sortOrder++,
        ],
      });
    } catch { /* already exists */ }
  }

  // ─── 7. Seller questions ──────────────────────────
  sortOrder = 0;
  for (const category of config.seller_questions) {
    for (const q of category.questions) {
      const cfg = JSON.stringify({
        ...(q.hint ? { hint: q.hint } : {}),
      });
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'seller_question', ?, ?, ?, ?, ?, 1, ?)`,
          args: [`ri_sq_${q.key}`, q.key, q.label, category.icon, category.key, cfg, sortOrder++],
        });
      } catch { /* already exists */ }
    }
  }
}
