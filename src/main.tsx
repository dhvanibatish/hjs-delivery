import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Pickups from './Pickups.tsx'
import ComplaintApp from './ComplaintApp.tsx'

const params = new URLSearchParams(window.location.search)
const isPickup = params.has('pickups')
const isComplaint = params.has('complaints')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isComplaint ? <ComplaintApp /> : isPickup ? <Pickups /> : <App />}
  </StrictMode>,
)
