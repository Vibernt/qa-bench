import Cookies from "js-cookie";
import { SESSION_USERNAME, VALID_PASSWORD, VALID_USERNAMES } from "./Constants";
// QA-BENCH: bench mode (generated accounts, faulty-user behaviour switched by env). See ./QaBench.js.
import { benchAccountOk, benchFaulty, benchIsAccount, benchMode } from "./QaBench";

// QA-BENCH: is the signed-in user (built-in) `name`, or a generated account carrying `name`'s behaviour?
function isUser(name) {
  const username = Cookies.get(SESSION_USERNAME);
  return benchMode() ? benchFaulty(name, username) : username === name;
}

/**
 * Verify the credentials
 *
 * @param {string} username
 * @param {string} password
 *
 * @return {boolean}
 */
export function verifyCredentials(username, password) {
  // QA-BENCH: in bench mode only the episode's generated accounts sign in; built-in usernames are refused.
  if (benchMode()) {
    return benchAccountOk(username, password);
  }

  if (password !== VALID_PASSWORD) {
    return false;
  }

  return VALID_USERNAMES.includes(username);
}

/**
 * Store the data in our cookies
 *
 * @param {string} username
 *
 * @param {string} password
 */
export function setCredentials(username, password) {
  let date = new Date();
  date.setTime(date.getTime() + 10 * 60 * 1000);

  Cookies.set(SESSION_USERNAME, username, { expires: date });
}

/**
 * Remove the credentials
 */
export function removeCredentials() {
  Cookies.remove(SESSION_USERNAME);
}

/**
 * Return current logged username
 *
 * @return {string | undefined}
 */
export function currentUser() {
  return Cookies.get(SESSION_USERNAME);
}

/**
 * Check if this is a problem user
 *
 * @return {boolean}
 */
export function isProblemUser() {
  return isUser("problem_user"); // QA-BENCH: was a cookie check for "problem_user"
}

/**
 * Check if this is a performance user
 *
 * @return {boolean}
 */
export function isPerformanceGlitchUser() {
  return isUser("performance_glitch_user"); // QA-BENCH: was a cookie check for "performance_glitch_user"
}

/**
 * Check if this a logged out user
 *
 * @return {boolean}
 */
export function isLockedOutUser() {
  return isUser("locked_out_user"); // QA-BENCH: was a cookie check for "locked_out_user"
}

/**
 * Check if this is an error user
 *
 * @return {boolean}
 */
export function isErrorUser() {
  return isUser("error_user"); // QA-BENCH: was a cookie check for "error_user"
}

/**
 * Check if the user is logged in with a valid username
 *
 * @return {boolean}
 */
export function isLoggedIn() {
  const sessionUsername = Cookies.get(SESSION_USERNAME);
  // QA-BENCH: in bench mode a session is valid only for a generated account (not locked out).
  if (benchMode()) {
    return benchIsAccount(sessionUsername) && !isLockedOutUser();
  }
  const isValidUsername = VALID_USERNAMES.includes(sessionUsername);

  return isValidUsername && sessionUsername !== "locked_out_user";
}

/**
 * Check if this is a visual user
 *
 * @return {boolean}
 */
export function isVisualUser() {
  return isUser("visual_user"); // QA-BENCH: was a cookie check for "visual_user"
}
