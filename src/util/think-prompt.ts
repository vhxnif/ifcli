import { createPrompt, useState } from '@inquirer/core'
import Emittery from 'emittery'

export const emittery = new Emittery()

export default createPrompt<number, unknown>((_, done) => {
    const [tk, setTk] = useState('')
    const thinkContent: string[] = []
    emittery.on('think', (data) => {
        console.log(`think ${data}`)
        thinkContent.push(`${data}`)
        setTk(thinkContent.join(''))
    })
    emittery.on('done', () => {
        done(-1)
    })
    return `${tk}`
})
