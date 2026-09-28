import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Pickups from './Pickups.tsx'
import ComplaintApp from './ComplaintApp.tsx'
import Attendance from './Attendance.tsx'
import Physio from './Physio.tsx'

const params = new URLSearchParams(window.location.search)
const isPickup = params.has('pickups')
const isComplaint = params.has('complaints')
const isAttendance = params.has('attendance')
const isPhysio = params.has('physio')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isComplaint ? <ComplaintApp /> : isPickup ? <Pickups /> : isAttendance ? <Attendance /> : isPhysio ? <Physio /> : <App />}
  </StrictMode>,
)
