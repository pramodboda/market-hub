import { useState } from 'react'
import heroImg from '../assets/hero.png'
import reactLogo from '../assets/react.svg'
import viteLogo from '../assets/vite.svg'
import './App.css'

import HomePage from "./pages/HomePage.tsx"

function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
    Nav menu : Mutual Funds, Indian Stocks, Global Stocks
    <HomePage/>
    </>
  )
}

export default App
