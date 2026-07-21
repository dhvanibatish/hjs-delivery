import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Pickups from './Pickups.tsx'

const isPickup = new URLSearchParams(window.location.search).has('pickups')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPickup ? <Pickups /> : <App />}
  </StrictMode>,
)
