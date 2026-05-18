// Match configuration constants
export const MAX_PLAYER_PER_MATCH = 10;
export const QUESTION_TIME_LIMIT = 30;
export const MAX_ACTIVE_MATCHES = 100;

// Timing constants
/** Internal scoring tick: drives matchRemainingTimes (same cadence as before). */
export const TIME_UPDATE_INTERVAL_MS = 100;
/** How often clients receive `timeUpdate` (lower = less Socket.IO traffic). */
export const TIME_BROADCAST_INTERVAL_MS = 250;
export const NEXT_QUESTION_DELAY_MS = 5000;

// Location answer thresholds (in meters)
export const LOCATION_RADIUS_1000 = 5000;
export const LOCATION_RADIUS_750 = 15000;
export const LOCATION_RADIUS_500 = 30000;

