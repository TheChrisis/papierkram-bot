#!/usr/bin/env node

import puppeteer from 'puppeteer'
import moment from 'moment'
import history from './history.js'
import cliSelect from 'cli-select'
import regionCodes from './regioncodes.js'
import { isHoliday } from 'feiertagejs'
import keychain from 'keychain'
import prompt from 'password-prompt'

const isValidUrl = urlString => {
  const urlPattern = new RegExp(
    '^(https?:\\/\\/)?' + // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ) // validate fragment locator
  return !!urlPattern.test(urlString)
}

const getPassword = email =>
  new Promise((resolve, reject) => {
    keychain.getPassword(
      {
        account: email,
        service: 'Papierkram Credentials',
        type: 'internet'
      },
      (err, pw) => {
        if (err) {
          reject(err)
        } else if (pw) {
          resolve(pw)
        } else {
          resolve(null)
        }
      }
    )
  })

;(async () => {
  moment.locale('de')

  let firstDate = moment(process.argv[2], 'DD/MM/YYYY') // start date
  let lastDate = moment(process.argv[3], 'DD/MM/YYYY') // end date
  let firstTime = process.argv[4] // start time
  let lastTime = process.argv[5] // end time

  const subject = process.argv[6] // Subject you want to book
  history.set('subject', subject)
  const email = process.argv[7]
  history.set('email', email)

  const pwArg = process.argv[8]?.trim()
  let savedPassword
  let newPassword

  try {
    savedPassword = await getPassword(email)
  } catch (_) {}

  if (!pwArg && !savedPassword) {
    newPassword = await prompt('Passwort: ', { mask: true })
  }

  const passwordToSet = pwArg || savedPassword || newPassword

  keychain.setPassword({
    account: email,
    service: 'Papierkram Credentials',
    type: 'internet',
    password: passwordToSet
  })

  let url = process.argv[9]
  const useMonth = process.argv[10].toLowerCase() === 'y'

  if (!isValidUrl(url) && !url.includes('papierkram.de')) {
    console.error('Eingabe URL ist nicht valide: ', url)
    return
  }

  history.set('url', url)
  history.save()

  const regionNames = Object.values(regionCodes)
  const regionKeys = Object.keys(regionCodes)

  console.log(
    'Von welchem Bundesland sollen die Feiertage berücksichtigt werden? '
  )
  const selectedRegion = await cliSelect({
    values: regionNames
  })

  const selectedRegionKey =
    regionKeys[regionNames.indexOf(selectedRegion.value)]
  console.log('Gewähltes Bundesland: ', selectedRegion.value.trim())

  if (useMonth) {
    const currentDate = moment()
    firstDate = currentDate.clone().startOf('month')
    lastDate = currentDate.clone().endOf('month')
    firstTime = '08:00'
    lastTime = '16:00'

    console.log(`Buchung für ${currentDate.format('MMMM YYYY')}`)
    console.log(`Erster Tag: ${firstDate.format('DD.MM.YYYY')} ${firstTime}`)
    console.log(`Letzter Tag: ${lastDate.format('DD.MM.YYYY')} ${lastTime}`)
  }

  const firstDateForUrl = firstDate
  let result = [moment({ ...firstDate })]

  while (lastDate.date() !== firstDate.date()) {
    firstDate.add(1, 'day')
    result.push(moment({ ...firstDate }))
  }

  const validDates = result
    .filter(day => {
      const isSaturday = day.toDate().getDay() === 6
      const isSunday = day.toDate().getDay() === 0
      return (
        !isSaturday && !isSunday && !isHoliday(day.toDate(), selectedRegionKey)
      )
    })
    .map(day => moment(day, 'DD/MM/YYYY').format('DD.MM.YYYY'))

  if (!validDates.length) {
    console.log(
      'In der angegebenen Zeitspanne wurden keine validen Tage gefunden.'
    )
    return
  }

  console.log('Auf folgende Tage wird gebucht: ', dates)
  const browser = await puppeteer.launch({
    headless: true
  })
  const page = await browser.newPage()

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  })
  const correctUrl = url.trim().endsWith('/') ? url : url + '/'
  console.log(`Logge ein in: ${correctUrl}`)
  await page.goto(`${correctUrl}login`, { waitUntil: 'networkidle2' })
  await page.type('#user_new_email', email, { delay: 100 })
  await page.type('#user_new_password', password, { delay: 100 })
  await page.click('input[name="commit"]', { delay: 500 })
  await page.waitForSelector('.user-name')
  await page.waitForSelector('i.icon-pk-tracker')
  console.log(`Login erfolgreich für User: ${email}`)
  await page.goto(
    correctUrl + 'zeiterfassung/buchungen?b=&show_new_form=true',
    { waitUntil: 'networkidle2' }
  )
  let selectedProject = ''
  let projectElement

  for (const day of dates) {
    await page.waitForSelector(
      '#s2id_tracker_time_entry_new_complete_project_id'
    )
    await page.click('#s2id_tracker_time_entry_new_complete_project_id')
    await new Promise(resolve => setTimeout(resolve, 1000))
    let elementHandle = await page.$$(
      '.select2-results-dept-1 .select2-result-label'
    )

    if (selectedProject.length === 0) {
      console.log('Verfügbare Projekte: ')
      const selection = await cliSelect({
        values: await Promise.all(
          elementHandle.map(
            async el => await page.evaluate(e => e.textContent, el)
          )
        )
      })
      selectedProject = selection.value
    }

    for (const e of elementHandle) {
      const elementText = await page.evaluate(el => el.textContent, e)
      if (elementText === selectedProject) {
        console.log('Buche auf Projekt: ', selectedProject)
        projectElement = e
      }
    }

    if (projectElement) {
      await projectElement.click({ delay: 200 })
    } else {
      await browser.close()
      throw new Error('Projekt nicht gefunden: ' + selectedProject)
    }

    await page.type('#tracker_time_entry_new_complete_task_name', subject, {
      delay: 100
    })

    await page.click('#tracker_time_entry_new_entry_date_f', { clickCount: 3 })
    await page.type('#tracker_time_entry_new_entry_date_f', day, { delay: 100 })
    await page.click('#tracker_time_entry_new_started_at_time', {
      clickCount: 3
    })
    await page.type('#tracker_time_entry_new_started_at_time', firstTime, {
      delay: 100
    })

    await page.click('#tracker_time_entry_new_ended_at_time', { clickCount: 3 })
    await page.type('#tracker_time_entry_new_ended_at_time', lastTime, {
      delay: 100
    })

    await page.click('input[name="commit"]', { delay: 500 })
    console.log('Zeit gebucht für: ', day)
    await new Promise(r => setTimeout(r, 1000))
    await page.goto(
      correctUrl + 'zeiterfassung/buchungen?b=&show_new_form=true',
      { waitUntil: 'networkidle2' }
    )
  }
  const controlUrl =
    correctUrl +
    'zeiterfassung/buchungen?t=' +
    firstDateForUrl.format('YYYY-MM-DD') +
    '..' +
    lastDate.format('YYYY-MM-DD')
  await page.waitForSelector('.logout')
  await page.click('.logout', { delay: 1000 })
  console.log('Logout erfolgreich. Bitte Zeiten kontrollieren: ' + controlUrl)
  await browser.close()
})()
