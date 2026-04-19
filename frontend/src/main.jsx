import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'

// import index.css here and can use globally
import '/index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import App from './App.jsx'
import { store } from './redux/store'
import './utils/apiClient.js' // Register global axios interceptors

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <Provider store={store}>
        <App />
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
