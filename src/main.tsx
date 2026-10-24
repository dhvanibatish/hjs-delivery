import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Pickups from './Pickups.tsx'
import ComplaintApp from './ComplaintApp.tsx'
import Attendance from './Attendance.tsx'
import Physio from './Physio.tsx'
// Pickup Test — alag file, sirf ?pickuptest pe load hoti hai (baaki app pe asar nahi)
const PickupTest = lazy(() => import('./pickup_test.tsx'))

const params = new URLSearchParams(window.location.search)
const isPickup = params.has('pickups')
const isComplaint = params.has('complaints')
const isAttendance = params.has('attendance')
const isPhysio = params.has('physio')
const isPickupTest = params.has('pickuptest')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPickupTest ? <Suspense fallback={null}><PickupTest /></Suspense> : isComplaint ? <ComplaintApp /> : isPickup ? <Pickups /> : isAttendance ? <Attendance /> : isPhysio ? <Physio /> : <App />}
  </StrictMode>,
)
