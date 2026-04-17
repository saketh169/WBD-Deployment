import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

// import index.css here and can use globally
import '/index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import App from './App.jsx'
import { store } from './redux/store'
import './utils/apiClient.js' // Register global axios interceptors

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
