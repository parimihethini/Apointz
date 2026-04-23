/**
 * Utility functions for Apointz
 */

/**
 * Format time from HH:MM (24-hour) to HH:MM AM/PM (12-hour)
 * @param {string} time - Time in HH:MM format
 * @returns {string} - Formatted time in HH:MM AM/PM format
 */
export const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

/**
 * Format a 24-hour time range to 12-hour format
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} - Formatted range like "02:00 PM - 03:00 PM"
 */
export const formatTimeRange = (startTime, endTime) => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

/**
 * Format a date string to readable format
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format a full date and time
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:MM format
 * @returns {string} - Formatted date and time
 */
export const formatDateTime = (dateStr, timeStr) => {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`;
};

/**
 * Format rating (e.g. 4.5)
 * @param {number} value - The rating value
 * @returns {string} - Formatted rating string
 */
export const formatRating = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.0" : num.toFixed(1);
};

/**
 * Format price (e.g. 1500.00)
 * @param {number} value - The price value
 * @returns {string} - Formatted price string
 */
export const formatPrice = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};
