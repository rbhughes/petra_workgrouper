const Fse = require('fs-extra')
const Path = require('path')

const PARMBASE = 'c:\\geoplus1\\parms'

const plan = require('./plan.json')

// ~~~~~~~
const buildPaths = (ini) => {
  const res = Fse.readFileSync(ini)
  const projName = res.toString().match(/ProjectName=(.*)/)[1]

  if (plan.toMove[projName]) {
    const projPath = Path.join(plan.toMove[projName].home, projName)
    const oPriDir = res.toString().match(/PrivateDir=(.*)/)[1]
    const oPriDirINI = Path.join(oPriDir, `${projName}.INI`)
    const oPriDirPRM = Path.join(oPriDir, 'PARMS')

    const wbase = plan.toMove[projName].parm.replace(/%USERNAME%/, process.env.username)
    const wPriDir = Path.join(wbase, projName)
    const wPriDirINI = Path.join(wbase, projName, `${projName}.INI`)
    const wPriDirPRM = Path.join(wbase, projName, 'PARMS')

    return {
      seedINI: ini,
      projName: projName,
      projPath: projPath,
      oPriDir: oPriDir,
      oPriDirINI: oPriDirINI,
      oPriDirPRM: oPriDirPRM,
      wPriDir: wPriDir,
      wPriDirINI: wPriDirINI,
      wPriDirPRM: wPriDirPRM
    }
  } else {
    return null
  }
}

// ~~~~~~~
const ensureDirs = (dirs) => {
  console.log('ensure dirs exist: ' + dirs.join(', '))
  for (const d of dirs) {
    Fse.ensureDirSync(d)
  }
}

// ~~~~~~~
const alreadyMoved = (pp) => {
  return (Fse.existsSync(pp.wPriDir) && Fse.existsSync(pp.wPriDirINI) &&
    Fse.existsSync(pp.wPriDirPRM) && Fse.existsSync(pp.seedINI + '__BAK'))
}

// ~~~~~~~
const writeNewINI = (pp) => {
  console.log('write new ini: ' + pp.wPriDirINI)
  let lines = Fse.readFileSync(pp.oPriDirINI).toString().split('\r\n')
  let out = []
  for (let r of lines) {
    if (r.match(/^PrivateDir/)) {
      r = `PrivateDir=${pp.wPriDir}`
    }
    if (r.match(/^PublicDir/)) {
      r = `PublicDir=${pp.projPath}`
    }
    out.push(r)
  }
  Fse.writeFileSync(pp.wPriDirINI, out.join('\r\n'))
}

// ~~~~~~~
const copyParmsDir = (pp) => {
  console.log('copy parms dir: ' + pp.wPriDirPRM)
  Fse.copySync(pp.oPriDirPRM, pp.wPriDirPRM)
}

// ~~~~~~~
const updateSeedINI = (pp) => {
  console.log('update seed ini: ' + pp.seedINI)
  Fse.moveSync(pp.seedINI, pp.seedINI + '__BAK')
  Fse.copySync(pp.wPriDirINI, pp.seedINI)
}


// ~~~~~~~
const updatePrevProj = (pp) => {
  const geoplusINI = 'c:\\geoplus1\\geoplus.ini'
  let res = Fse.readFileSync(geoplusINI).toString()
  const curr = res.match(/CURRPROJECT=(.*)/)[1]
  if (curr.match(new RegExp(pp.projName))) {
    console.log('updating prevproject: ' + pp.wPriDirINI)
    let out = []
    for (let r of res.split('\r\n')) {
      if (r.match(/^PREVPROJECT/)) {
        r = `PREVPROJECT=${pp.wPriDirINI}`
      }
      out.push(r)
    }
    Fse.writeFileSync(geoplusINI, out.join('\r\n'))
  }
}

// ~~~~~~~
const work = (base) => {
  Fse.readdir(base, (err, files) => {
    if (err) {
      console.log(err)
    }
    let inis = files.filter(f => { return f.match(/.ini$/i) })
    for (const i of inis) {
      const ini = Path.join(base, i)
      const pp = buildPaths(ini)
      //
      if (!pp) { continue }
      //
      if (alreadyMoved(pp)) {
        console.log('\n____ (already moved) ___ ' + pp.projName)
        //continue
      } else {
        console.log('\n_____ moving parms _____ ' + pp.projName)
      }
      //
      ensureDirs([pp.wPriDir])
      //
      writeNewINI(pp)
      //
      copyParmsDir(pp)
      //
      updateSeedINI(pp)
      //
      updatePrevProj(pp)

    }
  })
}

const undo = (base) => {
  Fse.readdir(base, (err, files) => {
    if (err) {
      console.log(err)
    }

    let inis = files.filter(f => { return f.match(/.ini$/i) })
    for (const i of inis) {
      console.log('removing new INI: ' + i)
      const x = Path.join(base, i)
      if (Fse.existsSync(x+'__BAK')) {
        Fse.removeSync(x)
      } else {
        console.log('WARNING: no __BAK, did not remove: ' + x)
      }
    }
    let baks = files.filter(f => { return f.match(/_bak$/i) })
    for (const b of baks) {
      console.log('reverting __BAK to INI')
      const x = Path.join(base, b)
      const prevName = x.replace('__BAK','')
      Fse.moveSync(x, prevName)
    }

    let inis2 = files.filter(f => { return f.match(/.ini$/i) })
    for (const i of inis2) {
      const ini = Path.join(base, i)
      const pp = buildPaths(ini)
      console.log('deleting copied parms: ' + pp.projName)
      Fse.removeSync(pp.wPriDirINI)
      Fse.removeSync(pp.wPriDirPRM)
      Fse.removeSync(pp.wPriDir)
    }
    console.log('did NOT set prev project')
  })
}

//work(PARMBASE)
undo(PARMBASE)




