#!/usr/bin/env node

import { NoArg } from 'noarg'
import { main } from './main.js'

const app = NoArg.create('openuse', {
  description: 'CLI tool to see detailed opencode usage',
  globalFlags: {
    db: NoArg.string().description(
      'Path to the opencode.db file. Overrides OPENCODE_DB_PATH environment variable'
    ),
  },
})

const allProgram = app.create('all', {
  description:
    'Show detailed usage and cost per day, broken down by model and provider',
})

const modelProgram = app.create('model', {
  description: 'Show usage and cost per day, broken down by model',
})

const totalProgram = app.create('total', {
  description: 'Show total usage and cost per day',
})

const providerProgram = app.create('provider', {
  description: 'Show usage and cost per day, broken down by provider',
})

app.on(([], flags) => {
  void main('model', flags.db)
})

allProgram.on(([], flags) => {
  void main('all', flags.db)
})

modelProgram.on(([], flags) => {
  void main('model', flags.db)
})

totalProgram.on(([], flags) => {
  void main('total', flags.db)
})

providerProgram.on(([], flags) => {
  void main('provider', flags.db)
})

app.start()
