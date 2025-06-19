/**
 * Extracts the short name from a student's UPN (User Principal Name).
 * @param {String} upn | test1234@domain.com
 * @returns {String|null} | The short name of the student, or null if no UPN is provided. | test1234
 * @description Extracts the short name from a student's UPN (User Principal Name).
 */
export function getStudentShortName(upn) {
    if (!upn) {
        console.error('No UPN provided to getStudentShortName')
        return null
    } else {
        const studentShortName = upn.split('@')[0].split('.').pop()
        return studentShortName
    }
}