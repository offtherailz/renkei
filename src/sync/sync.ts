export interface TimestampedEntity {
  updated_at: number;
}

export interface SyncPayload<T extends TimestampedEntity> {
  byId: Record<string, T>;
}

export interface DatabaseSyncShape {
  srs_progress: SyncPayload<TimestampedEntity>;
  user_personalization: SyncPayload<TimestampedEntity>;
  user_profile: SyncPayload<TimestampedEntity>;
}

function mergePayload<T extends TimestampedEntity>(local: SyncPayload<T>, cloud: SyncPayload<T>): SyncPayload<T> {
  const merged: Record<string, T> = { ...local.byId };

  for (const [id, cloudItem] of Object.entries(cloud.byId)) {
    const localItem = merged[id];
    if (!localItem || cloudItem.updated_at > localItem.updated_at) {
      merged[id] = cloudItem;
    }
  }

  return { byId: merged };
}

export function syncDatabase(localData: DatabaseSyncShape, cloudData: DatabaseSyncShape): DatabaseSyncShape {
  return {
    srs_progress: mergePayload(localData.srs_progress, cloudData.srs_progress),
    user_personalization: mergePayload(localData.user_personalization, cloudData.user_personalization),
    user_profile: mergePayload(localData.user_profile, cloudData.user_profile)
  };
}
