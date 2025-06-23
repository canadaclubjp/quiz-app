const credentials = process.env.REACT_APP_GOOGLE_CREDENTIALS
  ? JSON.parse(process.env.REACT_APP_GOOGLE_CREDENTIALS)
  : null;

export default credentials;