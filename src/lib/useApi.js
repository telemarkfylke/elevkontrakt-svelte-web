import axios from 'axios'
import { getMsalClient, login } from '../lib/auth/msal-auth'
import { jwtDecode } from 'jwt-decode';

/**
 * 
 * @param {boolean} decoded | If the token should be decoded or not
 * @returns | The access token for the user
 */
export const getElevkontraktToken = async (decoded) => {
    // MOCK access token for local api (the access token is just a demo token - nothing dangerous)
    // if (import.meta.env.VITE_MOCK_MSAL === 'true') return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcGk6Ly9ibGFibGFiIiwiaXNzIjoiaHR0cHM6Ly9kdXN0LmR1c3Rlc2VuLnZ0ZmsubmV0L2hhaGFoLyIsImlhdCI6MTcwNjM2MDM5MiwibmJmIjoxNzA2MzYwMzkyLCJleHAiOjE3MDYzNjU4MjAsImFjciI6IjEiLCJhaW8iOiJiYWJhYmFiYWIiLCJhbXIiOlsicnNhIiwibWZhIl0sInJvbGVzIjpbImR1c3RfYWNjZXNzIiwiYWRtaW5fYWNjZXNzIl0sImFwcGlkIjoiZ3VkZW5lIHZlaXQiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6IlNww7hrZWxzZSIsImdpdmVuX25hbWUiOiJEZW1vIiwiaXBhZGRyIjoiMjAwMToyMDIwOjQzNDE6ZmNiYjoyOTU5OjFjNmE6Y2RhYjoyNGUwIiwibmFtZSI6IkRlbW8gU3DDuGtlbHNlIiwib2lkIjoiMTIzNDUiLCJvbnByZW1fc2lkIjoiU1VTVVNVUyIsInJoIjoic2kgc2Vub3IiLCJzY3AiOiJ1c2VyX2ltcGVyc29uYXRpb24iLCJzdWIiOiJtYXJpbmUiLCJ0aWQiOiJza2xlbW1lIiwidW5pcXVlX25hbWUiOiJkZW1vLnNwb2tlbHNlQHZlc3Rmb2xkZnlsa2Uubm8iLCJ1cG4iOiJkZW1vLnNwb2tlbHNlQHZlc3Rmb2xkZnlsa2Uubm8iLCJ1dGkiOiJob2hvbyIsInZlciI6IjEuMCJ9.64xzW92dVIXpZ_2OXQ6KQHITtYByDZJn1ycX3p_EkW4'
    let accessToken
    if(!decoded) {
      decoded = false
    }
    try {
      const msalClient = await getMsalClient()
      if (!msalClient.getActiveAccount()) {
        console.log('Ingen aktiv bruker her enda - venter på ferdig pålogging før vi gjør API spørringer')
        throw new Error('User not logged in yet - waiting for successful login')
      }
      accessToken = (await msalClient.acquireTokenSilent({ scopes: [import.meta.env.VITE_DEFAULT_SCOPE] })).accessToken
      if(decoded) {
        // Return the decoded token
        const result = {
          upn: '',
          name: '',
          oid: '',
          roles: []
        }
        let decodedToken = jwtDecode(accessToken)
        const { upn, roles, name, oid} = decodedToken
        result.upn = upn || 'appReg'
        result.roles = roles || []
        result.name = name || 'appReg'
        result.oid = oid || 'appReg'
  
        return result
      }
      return accessToken
    } catch (error) {
      // EN CASE HER ER AT BRUKER har tilgang på frontend men ikke api (app registrering)
      if (error.toString().startsWith('Error: User not logged in yet')) { // Liten frekkas - om bruker ikke er logget inn, kast en error og vent på "vellykket" (hva slags ord skal brukes her egt???) login
        throw error
      }
      // If acquireTokenSilent failed and user is (on the paper/session storage) logged in - we assume the user has been logged out or the refresh token has expired - simply log in again :)
      await login(true) // Sends the user back to main-page, so the search will have to be done again (this should not happen often)
    }
}

/**
 * 
 * @param {String} school - The school to fetch contracts for. If not provided, fetches contracts for all schools.
 * @returns | A promise that resolves to the contracts data or an error object.
 * @description Fetches contracts from the Elevkontrakt API. If a school is provided, it fetches contracts for that specific school.
 */
export const getContracts = async (school) => {
    const token = await getElevkontraktToken()
    const url = `${import.meta.env.VITE_ELEVKONTRAKT_API_URL}/handleDbRequest${import.meta.env.VITE_MOCK_DATA === "true" ? '?isMock=true' : '?isMock=false'}${school ? `&school=${school}` : ''}`;
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return data;
}

/**
 * Fetches contract information based on the provided contract ID.
 * @param {string} contractID - The ID of the contract to fetch information for.
 * @param {string} pcInfo - The PC information to include in the request.
 * @returns {Promise<Object>} - A promise that resolves to the contract information or an error object.
 */
export const putContractPCStatusChange = async (contractID, pcInfo) => {
    const token = await getElevkontraktToken()
    const url = `${import.meta.env.VITE_ELEVKONTRAKT_API_URL}/handleDbRequest${import.meta.env.VITE_MOCK_DATA === "true" ? '?isMock=true' : '?isMock=false'}`;
    try {
        const data = await axios.put(url, {contractID: contractID, ...pcInfo}, {headers: { Authorization: `Bearer ${token}` }});
        return data
    } catch (error) {
        console.error('Error in putContractPCStatusChange:', error)
        throw error; // Rethrow the error to handle it in the calling function
    }
}

/**
 * Fetches extended user information based on the provided UPN (User Principal Name).
 *
 * @param {string} upn - The User Principal Name to fetch information for.
 * @returns {Promise<Object>} - A promise that resolves to the extended user information or an error object.
 */
export const getExtendedUserInfo = async (upn) => {
  // Check if the upn is provided
  if(!upn) return { error: 'No upn provided' }
  const token = await getElevkontraktToken()
  try {
    const response = await axios.get(import.meta.env.VITE_ELEVKONTRAKT_API_URL + `/extendedUserInfo/${upn}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response
  } catch (error) {
    return error
  }
}

/**
 * 
 * @param {String} ssn | The ssn to check
 * @returns | The student data or an error object
 * @description Checks if a student exists in the Elevkontrakt API. If the student exists, it returns the student data.
 */
export const checkStudent = async (ssn) => {
  const token = await getElevkontraktToken()
  const url = `${import.meta.env.VITE_ELEVKONTRAKT_API_URL}/checkStudent/${ssn}/false}`;
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return data;
}