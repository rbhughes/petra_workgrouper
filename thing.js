const Fse = require('fs-extra')
const Path = require('path')

const geoplusINI = 'c:\\geoplus1\\geoplus.ini'
const geoplusParms = 'c:\\geoplus1\\parms'

const plan = require('./plan.json')


// ~~~~~~~
const updateParmINI = (ini, privateDir, publicDir) => {
  let lines = Fse.readFileSync(ini).toString().split('\r\n')
  let out = []
  for (let r of lines) {
    if (r.match(/^PrivateDir/)) {
      r = `PrivateDir=${privateDir}`
    }

    if (r.match(/^PublicDir/)) {
      r = `PublicDir=${publicDir}`
    }
    out.push(r)
  }
  Fse.writeFileSync(ini, out.join('\r\n'))
}

// ~~~~~~~
const updatePrevProject = (prevProjIni) => {
  let lines = Fse.readFileSync(geoplusINI).toString().split('\r\n')
  let out = []
  for (let r of lines) {
    if (r.match(/^PREVPROJECT/)) {
      r = `PREVPROJECT=${prevProjIni}`
    }
    out.push(r)
  }
  Fse.writeFileSync(geoplusINI, out.join('\r\n'))
}

const processPriParmINI = (ini) => {
  Fse.readFile(ini, (err, res) => {
    if (err) {
      console.log(err)
    }

    const projectName = res.toString().match(/ProjectName=(.*)/)[1]
    const privateDir = res.toString().match(/PrivateDir=(.*)/)[1]
    const renamedPriDir = privateDir + '_MOVED'

    if (!Fse.existsSync(privateDir)) {
      if (!Fse.existsSync(renamedPriDir)) {
        console.log(`POTENTIAL PROBLEM: ${privateDir}`)
        return null
      } else {
        console.log(`ALREADY MOVED: ${privateDir}`)
        return null
      }
    }

    if (plan.toMove[projectName]) {
      const priDir = privateDir
      const priDirIni = Path.join(privateDir, `${projectName}.INI`)
      const priDirParm = Path.join(privateDir, 'PARMS')

      const base = plan.toMove[projectName].parm.replace(/%USERNAME%/, process.env.username)
      const nppDir = Path.join(base, projectName)
      const nppDirIni = Path.join(base, projectName, `${projectName}.INI`)
      const nppDirParm = Path.join(base, projectName, 'PARMS')

      const proj = Path.join(plan.toMove[projectName].home, projectName)

      /*
      console.log('----------------------------------------------------')
      console.log(priDir)
      console.log(priDirIni)
      console.log(priDirParm)
      console.log(renamedPriDir)
      console.log('================')
      console.log(nppDir)
      console.log(nppDirIni)
      console.log(nppDirParm)
      console.log('----------------------------------------------------')
      */

      //TODO .bak creation
      //TODO registry set server
      //TODO conditional PREVPROJECT set

      Fse.copySync(priDirIni, priDirIni + '.bak')

      console.log('1. ensure that paths exist:')
      console.log(`   ${nppDir}`)
      Fse.ensureDirSync(nppDir)
      console.log('')

      console.log('2. copy old parms ini to new location')
      console.log(`   ${priDirIni} -->\n     ${nppDirIni}`)
      if (!priDirIni.toLowerCase() === nppDirIni.toLowerCase() || !Fse.existsSync(nppDirIni)) {
        Fse.copySync(priDirIni, nppDirIni)
      } else {
        console.log('   (SKIPPED, already copied)')
      }
      console.log('')

      console.log('3. copy old parms dir to new location')
      console.log(`   ${priDirParm} -->\n     ${nppDirParm}`)
      if (!priDirParm.toLowerCase() === nppDirParm.toLowerCase() || !Fse.existsSync(nppDirParm)) {
        Fse.copySync(priDirParm, nppDirParm)
      } else {
        console.log('   (SKIPPED, already copied)')
      }
      console.log('')

      // console.log('4. rename old parms dir')
      // if (!Fse.pathExistsSync(Path.join(priDir, 'DB')) && Fse.pathExistsSync(nppDirParm)) {
      //   console.log(` RENAME: ${priDir}`)
      //   // Fse.moveSync(priDir, renamedPriDir)
      // } else {
      //   console.log(`4. WILL NOT MOVE (privateDir in project): ${priDir}`)
      // }
      // console.log('')

      console.log('4. update paths in new parms ini')
      console.log('   ' + nppDirIni)
      updateParmINI(nppDirIni, nppDir, proj)
      console.log('')

      console.log('5. copy new parms ini to c:\\geoplus1\\parms')
      console.log('   ' + Path.join(`c:\\geoplus1\\parms\\${projectName}.INI`))
      Fse.copySync(nppDirIni, Path.join(`c:\\geoplus1\\parms\\${projectName}.INI`))
      console.log('')

      console.log('6. update PREVPROJECT value in geoplus.ini')
      console.log('   ' + geoplusINI + ' <-- ' + nppDirIni)
      updatePrevProject(nppDirIni)
      console.log('')
    }
  })
}

const another = () => {
  Fse.readdir(geoplusParms, (err, files) => {
    if (err) {
      console.log(err)
    }
    let inis = files.filter(f =>{ return f.match(/.ini$/i)})
    for (const i of inis) {
      const ini = Path.join(geoplusParms, i)

      processPriParmINI(ini)
    }

  })
}

// console.log(process.env.username)
// doStuff()
another()
