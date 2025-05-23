<script>
    import '../app.css';
    import { login, getMsalClient } from '../lib/auth/msal-auth.js'
    import { getElevkontraktToken } from '../lib/useApi.js'
    import { afterUpdate, beforeUpdate, onMount, tick } from 'svelte'
    import { page } from '$app/stores'
    import { goto } from '$app/navigation'
    import logoTFK from '$lib/assets/logo.svg'
    import logoVFK from '$lib/assets/VFK_logo.svg'
    import favTFK from '$lib/assets/favicon-32x32.png'
    import favVFK from '$lib/assets/vestfold-favicon-32x32.png'
    import IconSpinner from '../lib/components/IconSpinner.svelte'
    
    let account = null

    onMount(async () => {
      const authenticate = async () => {
        const msalClient = await getMsalClient()
        if (msalClient.getActiveAccount()) {
          account = msalClient.getActiveAccount()
          // console.log('Active account:', account)
        }
        if (!account) {
          const loginResponse = await login(false, $page.url.pathname) // Sends you to ms auth, and redirects you back here with the msalClient set with active account
          account = loginResponse.account
          if ($page.url.pathname !== loginResponse.loginRequestUrl) {
            goto(loginResponse.loginRequestUrl, { replaceState: false, invalidateAll: true })
          }
        }
      }
      authenticate()   
      return () => {
        // console.log('Destroyyyy')
        // on destroy (probs just wipe state)
      }
    })

    const appTitle = "Elevavtaler"
    let logo = ""
    let iconPath = ""
    if(import.meta.env.VITE_COUNTY === 'Telemark') {
      logo = logoTFK
      iconPath = favTFK
    } else {
      logo = logoVFK
      iconPath = favVFK
    }

    const isActiveRoute = (route, currentRoute) => {
      if (currentRoute === route) return true
      if (route.length > 1 && currentRoute.substring(0, route.length) === route) return true
      return false
    }

    const getInitials = (name) => {
      const firstInitial = name.substring(0,1)
      const nameList = name.split(' ')
      if (nameList.length < 2) return firstInitial
      const lastInitial = nameList[nameList.length-1].substring(0,1)
      return `${firstInitial}.${lastInitial}`
    }

    $: sideMenuItems = [
    {
      title: 'Hjem',
      href: '/',
      icon: 'home'
    },
    {
      title: 'Hjelp',
      href: '/hjelp',
      icon: 'help'
    }
  ]
  const checkRoles = async (token) => {
    if(token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))) {
      sideMenuItems.splice(1, 0, {
        title: 'Opprett avtale',
        href: '/contract',
        icon: 'assignment'
      })
    }
  }
</script>


<svelte:head>
    <link rel="icon" type="image/svg" href={iconPath} />
    <title>{appTitle}</title>
</svelte:head>
{#if !account}
  <div class="loading">
    <IconSpinner width={"32px"} />
  </div>
{:else}
  {#await getElevkontraktToken(true)}
    <div class="loading">
      <IconSpinner width={"32px"} />
    </div>
  {:then token}
    {#await checkRoles(token)}
      <div class="loading">
        <IconSpinner width={"32px"} />
      </div>
    {:then}
      {#if token.roles.length === 0}
        <div class="contentContainer">
          <h3>Du har ikke tilgang til denne applikasjonen.</h3>
          <h3>Kontakt servicedesk på din lokasjon om du trenger tilgang</h3>
        </div>
      {:else}
        <div class="layout">
          <div class="fakesidebartotakeupspace">
            <p>Jeg burde ikke synes</p>
          </div>
          <div class="sidebar">
            <a class="logoLink inward-focus-within" href="/">
              <img class="logo" src={logo} alt="Fylkekommunens logo" />
            </a>
            {#each sideMenuItems as menuItem}
              <a href={menuItem.href} class="menuLink inward-focus-within">
                <div class="menuItem{isActiveRoute(menuItem.href, $page.url.pathname) ? ' active' : ''}">
                  <span class="material-symbols-outlined">{menuItem.icon}</span>
                  <div>{menuItem.title}</div>
                </div>
              </a>
            {/each}
          </div>
          <div class="pageContent">
            <div class="topbar">
              <h1>{appTitle}</h1>
              <div class="userContainer">
                <div class="displayName">
                  <span>
                    {token.name}
                  </span>
                </div>
                <div class="displayNameMobile">
                  <span>
                    {getInitials(token.name)}
                  </span>
                </div>
              </div>
            </div>
            <div class="contentContainer">
              <slot></slot>
            </div>
          </div>
        </div>
      {/if}
    {/await}
  {/await}
{/if}

<style>
  .contentContainer {
    padding: 1rem 4rem;
    height: 100%;
    width: 100%;
  }
  .content {
    margin: 0rem auto 0rem auto;
  }
  .layout {
    display: flex;
  }
  .fakesidebartotakeupspace, .sidebar {
    width: 8rem;
    flex-direction: column;
    flex-shrink: 0;
    align-items: center;
    padding: 1.5rem 0rem;
    display: flex;
    height: 100%;
    background-color: var(--vann-30);
  }
  .sidebar {
    position: fixed;
  }
  .menubarMobile {
    display: none;
  }
  .logoLink {
    padding-bottom: 2rem;
  }
  .logo {
    width: 8rem;
  }
  .menuLink, .menuLinkMobile, .logoLink {
    /*border-bottom: 1px solid var(--primary-color);*/
    text-decoration: none;
    color: var(--font-color);
  }
  .menuItem {
    width: 8rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem 0rem;
    cursor: pointer;
  }
  .menuItem span {
    font-size: 1.5rem;
  }
  .menuItem.active, .menuItemMobile.active {
    font-weight: bold;
    background-color: var(--vann-40);
  }
  .menuItem:hover, .menuItemMobile:hover {
    background-color: var(--vann-10);
  }
  .pageContent {
    flex-grow: 1;
    max-width: 80rem;
    margin: 0rem auto;
    padding: 0rem;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 2rem;
    border-bottom: 2px solid var(--vann-30);
  }
  .userContainer .displayName, .displayNameMobile {
    display: flex;
    flex-direction: column;
  }

  /* Smaller devices */
  @media only screen and (max-width: 768px) {
    .fakesidebartotakeupspace, .sidebar {
      display: none;
    }
    .menubarMobile {
      z-index: 100;
      position: fixed;
      bottom: 0rem;
      align-items: center;
      justify-content: space-between;
      display: flex;
      width: 100vw;
      background-color: var(--vann-30);
      overflow: scroll;
    }
    .menuLinkMobile {
      flex-grow: 1;
    }
    .menuItemMobile {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 1rem;
      cursor: pointer;
    }
    .menuItem span {
      font-size: 1.5rem;
    }
    .topbar {
      padding: 0rem 1rem;
    }
    .contentContainer {
      padding: 1rem 1rem 5rem 1rem;
    }
    .pathtracker {
      padding: 0.4rem 1rem;
    }
    .userContainer .displayName {
      display: none;
    }
    .userContainer .displayNameMobile {
      display: flex;
    }
  }
</style>