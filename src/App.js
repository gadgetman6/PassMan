import React from 'react'
import ReactDOM from 'react-dom'
import { useMoralis, useNewMoralisObject, useMoralisQuery } from 'react-moralis'
import { Moralis } from 'moralis'
import Crypto from 'crypto-js'

var secretKey = null

function genKey () {
  if (!secretKey) {
    secretKey = Crypto.lib.WordArray.random(16).toString()
  }
  return secretKey
}

const App = () => {
  const {
    authenticate,
    isAuthenticated,
    user,
    logout,
    refetchUserData,
    userError,
    setUserData,
    isUserUpdating
  } = useMoralis()

  const { isSaving, error, save, setAcl } = useNewMoralisObject('UserPasswords')
  const { fetch, data, queryError, isLoading } = useMoralisQuery(
    'UserPasswords'
    // query => query.get('syV674m7b8CUVRoHLjdWBLx2')
  )

  const [websiteUrl, setWebsiteUrl] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [secretKey, setSecretKey] = React.useState('')

  const [masterKey, setMasterKey] = React.useState('')

  var tempSecretKey = 'My New Secret Key'

  const [userElements, setUserElements] = React.useState([])

  React.useEffect(() => {
    // updateDiv()
  }, [user])

  React.useEffect(() => {
    // alert ("HELLO")
    setWebsiteUrl(' ')
    setWebsiteUrl('')
  }, [isSaving])

  const handleUrlChange = event => {
    setWebsiteUrl(event.target.value)
  }

  const handleSecretKeyChange = event => {
    setSecretKey(event.target.value)
  }

  const handleUserChange = event => {
    setUsername(event.target.value)
  }

  const handlePassChange = event => {
    setPassword(event.target.value)
  }

  const handleKeyChange = event => {
    setMasterKey(event.target.value)
  }

  const submitToPage = () => {
    if (isAuthenticated) {
      refetchUserData().then(() => {
        if (userError) {
          console.log(userError)
        }
        if (!username || !password || !websiteUrl || !secretKey) {
          alert('Please fill in all required fields')
        } else {
          var hashKey = user.get('keyHash')

          if (Crypto.SHA256(secretKey).toString() == hashKey) {
            var passwordArray = user.get('passwords')

            var webUrl = Crypto.AES.encrypt(websiteUrl, secretKey).toString()
            var hmac = Crypto.HmacSHA256(
              webUrl,
              Crypto.SHA256(secretKey)
            ).toString()
            webUrl = hmac + webUrl

            var pass = Crypto.AES.encrypt(password, secretKey).toString()
            var hmac = Crypto.HmacSHA256(
              pass,
              Crypto.SHA256(secretKey)
            ).toString()
            pass = hmac + pass

            var usr = Crypto.AES.encrypt(username, secretKey).toString()
            var hmac = Crypto.HmacSHA256(
              usr,
              Crypto.SHA256(secretKey)
            ).toString()
            usr = hmac + usr

            passwordArray.push({
              websiteUrl: webUrl,
              username: usr,
              password: pass
            })
            if (!isUserUpdating) {
              setUserData({
                passwords: passwordArray
              })
            }

            // if (!isSaving) {
            //   save({
            //     password: {
            //       websiteUrl: websiteUrl,
            //       username: username,
            //       password: password
            //     }
            //   })
            // }

            // fetch()
            refetchUserData()
            // // console.log(JSON.stringify(data[0], null, 2))
            setWebsiteUrl('')
            setUsername('')
            setPassword('')
            setSecretKey('')
            setUserElements([])
          } else {
            alert('Must use correct secret key in order to add to data')
          }
        }
      })
    }

    // console.log(user)
  }

  if (!window.ethereum) {
    return (
      <div>
        <h1 style={{ marginLeft: 20 }}>PassMan</h1>
        <h2>
          Please install a crypto wallet to continue (MetaMask, WalletConnect,
          etc)
        </h2>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h1 style={{ marginLeft: 20 }}>PassMan</h1>
        <button style={{ marginLeft: 20 }} onClick={() => authenticate()}>
          Login
        </button>
      </div>
    )
  }

  const onEnterMasterKey = () => {
    console.log('run')
    if (user.get('passwords')) {
      var elems = []

      for (var obj of user.get('passwords')) {
        console.log(obj)
        var webUrl = obj.websiteUrl
        var usr = obj.username
        var pw = obj.password

        var enteredSecretKey = masterKey

        var transitHmac = webUrl.substring(0, 64)
        var transitEncrypted = webUrl.substring(64)

        var decryptedHmac = Crypto.HmacSHA256(
          transitEncrypted,
          Crypto.SHA256(enteredSecretKey)
        ).toString()

        if (transitHmac == decryptedHmac) {
          webUrl = Crypto.AES.decrypt(
            transitEncrypted,
            enteredSecretKey
          ).toString(Crypto.enc.Utf8)

          transitEncrypted = pw.substring(64)

          pw = Crypto.AES.decrypt(transitEncrypted, enteredSecretKey).toString(
            Crypto.enc.Utf8
          )

          console.log(pw)

          transitEncrypted = usr.substring(64)

          usr = Crypto.AES.decrypt(transitEncrypted, enteredSecretKey).toString(
            Crypto.enc.Utf8
          )

          console.log(usr)

          elems.push(
            <div>
              <h3>Website URL: {webUrl}</h3>
              <h3>Username: {usr}</h3>
              <h3>Password: {pw}</h3>
              <br />
              <br />
            </div>
          )
        } else {
          alert('Please enter correct master key!')
        }

        setUserElements(elems)
      }
    } else {
      setUserData({
        passwords: []
      })
    }
  }

  const saveKeyHash = key => {
    var hash = Crypto.SHA256(key).toString()
    setUserData({ keyHash: hash })
    setUserData({ passwords: [] })
  }

  if (isAuthenticated) {
    if (!user.get('keyHash')) {
      var newSecretKey = genKey()
      return (
        <div>
          <h1 style={{ marginLeft: 20 }}>PassMan</h1>
          <h3>Your secret key: {newSecretKey}</h3>
          <h4 style={{ width: 500 }}>
            You must write down this key or store it in a secure place. Giving
            anyone this key is very dangerous as they could have access to your
            passwords. Additionally, PassMan does not store these keys. Losing
            this key means that there is no way to recover your data! Refresh
            the page to generate a new key and press continue to confirm this
            key.
          </h4>
          <button onClick={() => saveKeyHash(newSecretKey)}>Continue</button>
        </div>
      )
    }
  }

  return (
    <div>
      <h1 style={{ marginLeft: 20 }}>Welcome {user.get('ethAddress')}</h1>
      <button style={{ marginLeft: 20 }} onClick={() => logout()}>
        Logout
      </button>
      <br />
      <br />
      <form style={{ marginLeft: 20 }}>
        <label>
          Website URL: {'               '}
          <input
            name='webUrl'
            value={websiteUrl}
            type='text'
            onChange={handleUrlChange}
          />
        </label>{' '}
        <br />
        <br />
        <label>
          Username: {'               '}
          <input
            name='user'
            value={username}
            type='text'
            onChange={handleUserChange}
          />
        </label>
        <br />
        <br />
        <label>
          Password: {'               '}
          <input
            name='pass'
            value={password}
            type='text'
            onChange={handlePassChange}
          />
        </label>
        <br />
        <br />
        <label>
          Secret Key: {'               '}
          <input
            name='secKey'
            value={secretKey}
            type='password'
            onChange={handleSecretKeyChange}
          />
        </label>
        <br />
        <br />
      </form>
      <button style={{ marginLeft: 20 }} onClick={submitToPage}>
        Submit
      </button>
      <br />
      <br />
      <h2>Enter master key</h2>
      <input
        name='masterKey'
        value={masterKey}
        type='password'
        onChange={handleKeyChange}
      />
      <br />
      <button onClick={onEnterMasterKey}>Reveal Passwords</button>
      <br />
      <div>{userElements}</div>
    </div>
  )
}

export default App
