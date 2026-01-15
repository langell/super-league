/**
 * Shared application constants
 * Centralized location for magic numbers used across the application
 * 
 * NOTE: This file intentionally contains numeric literals as they define the constants themselves.
 * The "magic numbers" in this file are not violations - they ARE the named constants.
 */

// UI Layout Constants
export const UI = {
    GRID_COLS_SM: 6,
    GRID_COLS_MD: 12,
    GRID_COLS_DEFAULT: 4,
    SPACING_SM: 4,
    SPACING_MD: 8,
    SPACING_LG: 16,
    SPACING_XL: 20,
    MAX_WIDTH_SM: 400,
    MAX_WIDTH_MD: 600,
    MAX_WIDTH_LG: 900,
    MAX_WIDTH_XL: 950,
} as const;

// Pagination & List Limits
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
    ITEMS_PER_PAGE_SM: 5,
    ITEMS_PER_PAGE_MD: 10,
    ITEMS_PER_PAGE_LG: 20,
} as const;

// Golf-Specific Constants
export const GOLF = {
    STANDARD_PAR: 72,
    MAX_HOLES: 18,
    MIN_PAR: 3,
    MAX_PAR: 5,
    TYPICAL_PAR: 4,
    MAX_PLAYERS_PER_TEAM: 4,
    MIN_PLAYERS_PER_MATCH: 2,
} as const;

// Time Constants (milliseconds)
export const TIME = {
    DEBOUNCE_DEFAULT: 300,
    DEBOUNCE_SEARCH: 500,
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 200,
} as const;

// HTTP Status Codes (for reference)
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
} as const;
