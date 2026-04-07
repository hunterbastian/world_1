import './style.css'
import { Game } from './game/Game'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app element')

app.replaceChildren()

const canvas = document.createElement('canvas')
canvas.id = 'game'
app.appendChild(canvas)

new Game(canvas).start()
