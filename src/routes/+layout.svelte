<script>
    import '../app.css'
    import { login, getMsalClient } from '../lib/auth/msal-auth.js'
    import { getElevkontraktToken } from '../lib/useApi.js'
    import { onMount } from 'svelte'
    import { page } from '$app/stores'
    import { goto, afterNavigate } from '$app/navigation'
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import NavMenu from '$lib/components/NavMenu.svelte'
    import UserMenu from '$lib/components/UserMenu.svelte'
    import { setPreview, previewRoleInfo } from '$lib/helpers/rolePreview.js'
    import { hasAnyRole, ELEVKONTRAKT_ADMIN, CONTRACT_ROLES, HISTORY_ROLES, BILLING_ROLES } from '$lib/helpers/roles.js'
    import logoTFK from '$lib/assets/logo.svg'
    import logoVFK from '$lib/assets/VFK_logo.svg'
    import favTFK from '$lib/assets/favicon-32x32.png'
    import favVFK from '$lib/assets/vestfold-favicon-32x32.png'

    const appTitle = 'Elevavtaler'
    const telemark = import.meta.env.VITE_COUNTY === 'Telemark'
    const logo = telemark ? logoTFK : logoVFK
    const iconPath = telemark ? favTFK : favVFK
    const BILLING_WRITE_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.billing-readwrite']

    // Menu groups. roles: null means everyone. Empty groups are hidden.
    const GROUPS = [
        { title: 'Avtaler', items: [
            { title: 'Oversikt', href: '/', icon: 'home', roles: null },
            { title: 'Opprett avtale', href: '/contract', icon: 'assignment', roles: CONTRACT_ROLES },
            { title: 'Historikk', href: '/history', icon: 'archive', roles: HISTORY_ROLES }
        ] },
        { title: 'Faktura', items: [
            { title: 'Fakturering', href: '/billing', icon: 'receipt_long', roles: BILLING_WRITE_ROLES },
            { title: 'Fakturaer', href: '/invoices', icon: 'receipt', roles: BILLING_ROLES },
            { title: 'Fakturer fra fil', href: '/fakturer-fra-fil', icon: 'upload_file', roles: [ELEVKONTRAKT_ADMIN] }
        ] },
        { title: 'Admin', items: [
            { title: 'Innstillinger', href: '/config', icon: 'settings', roles: [ELEVKONTRAKT_ADMIN] }
        ] }
    ]
    const HELP = { title: 'Hjelp', href: '/hjelp', icon: 'help' }

    let account = null
    let menuOpen = false

    onMount(async () => {
        const msalClient = await getMsalClient()
        if (msalClient.getActiveAccount()) account = msalClient.getActiveAccount()
        if (!account) {
            // Sends you to MS login, and back here with an active account
            const loginResponse = await login(false, $page.url.pathname)
            account = loginResponse.account
            if ($page.url.pathname !== loginResponse.loginRequestUrl) {
                goto(loginResponse.loginRequestUrl, { replaceState: false, invalidateAll: true })
            }
        }
    })

    afterNavigate(() => { menuOpen = false })

    const groupsFor = (token) => GROUPS
        .map(group => ({ ...group, items: group.items.filter(item => !item.roles || hasAnyRole(token, item.roles)) }))
        .filter(group => group.items.length)
</script>

<svelte:head>
    <link rel="icon" type="image/png" href={iconPath} />
    <title>{appTitle}</title>
</svelte:head>

<DsScope>
    {#if !account}
        <div class="center-state"><DsSpinner size="sm" title="Logger inn" /><p class="ds-paragraph" data-size="sm">Logger inn …</p></div>
    {:else}
        {#await getElevkontraktToken(true)}
            <div class="center-state"><DsSpinner size="sm" title="Laster" /><p class="ds-paragraph" data-size="sm">Laster …</p></div>
        {:then token}
            {#if !token?.roles?.length}
                <div class="center-state">
                    <div class="no-access">
                        <h1 class="ds-heading" data-size="md">{appTitle}</h1>
                        <DsAlert color="warning" heading="Du har ikke tilgang til Elevavtaler">
                            <p class="ds-paragraph" data-size="sm">Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                            <p class="ds-paragraph" data-size="sm">Oppgi at henvendelsen gjelder rollen din i Elevavtaler.</p>
                        </DsAlert>
                    </div>
                </div>
            {:else}
                {@const groups = groupsFor(token)}
                <div class="app">
                    <aside class="sidebar">
                        <a class="logo" href="/"><img src={logo} alt="Fylkeskommunens logo, til Oversikt" /></a>
                        <NavMenu {groups} bottom={[HELP]} path={$page.url.pathname} id="side" />
                    </aside>
                    <div class="main">
                        <header class="topbar">
                            <button class="ds-button menu-btn" data-variant="tertiary" data-size="sm" type="button" aria-haspopup="dialog" on:click={() => (menuOpen = true)}>
                                <span class="material-symbols-outlined" aria-hidden="true">menu</span>Meny
                            </button>
                            <p class="ds-heading app-name" data-size="xs">{appTitle}</p>
                            <UserMenu {token} />
                        </header>
                        {#if token.previewRole}
                            <div class="preview-bar" role="status">
                                <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                                <p class="ds-paragraph" data-size="sm">Du ser løsningen som <strong>{previewRoleInfo(token.previewRole)?.label}</strong>{#if token.previewSchool} ved <strong>{token.previewSchool}</strong>{/if}. Handlinger du gjør, bruker fortsatt administratortilgangen din.</p>
                                <button class="ds-button" data-variant="secondary" data-color="neutral" data-size="sm" type="button" on:click={() => setPreview(null)}>Tilbake til administrator</button>
                            </div>
                        {/if}
                        <div class="content">
                            <slot />
                        </div>
                    </div>
                </div>

                <DsDialog bind:open={menuOpen} placement="left" width="min(20rem, 88vw)" label="Meny" closeLabel="Lukk meny">
                    <p class="ds-heading" data-size="xs">{appTitle}</p>
                    <NavMenu {groups} bottom={[HELP]} path={$page.url.pathname} id="drawer" />
                </DsDialog>
            {/if}
        {/await}
    {/if}
</DsScope>

<style>
    .center-state {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--ds-size-3);
        padding: var(--ds-size-6);
        color: var(--ds-color-accent-text-default);
    }

    .no-access {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
        max-width: 30rem;
        color: var(--ds-color-neutral-text-default);
    }

    .app {
        display: flex;
        min-height: 100dvh;
        background: var(--ds-color-neutral-background-default);
        color: var(--ds-color-neutral-text-default);
    }

    /* The sidebar and topbar stay put while the page scrolls. */
    .sidebar {
        position: sticky;
        top: 0;
        width: 15rem;
        height: 100dvh;
        flex-shrink: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-6);
        padding: var(--ds-size-5) var(--ds-size-3);
        background: var(--ds-color-accent-background-tinted);
        border-inline-end: 1px solid var(--ds-color-accent-border-subtle);
    }

    .logo {
        display: block;
        padding-inline: var(--ds-size-2);
        border-radius: var(--ds-border-radius-md);
    }

    .logo img {
        display: block;
        width: 100%;
        max-width: 11rem;
    }

    .logo:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
    }

    .main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: var(--ds-size-3);
        min-height: 4rem;
        padding: var(--ds-size-3) var(--ds-size-6);
        background: var(--ds-color-neutral-background-default);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .app-name {
        margin-inline-end: auto;
    }

    .menu-btn {
        display: none;
    }

    .preview-bar {
        position: sticky;
        top: 4rem;
        z-index: 9;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-3);
        padding: var(--ds-size-2) var(--ds-size-6);
        background: var(--ds-color-warning-surface-tinted);
        border-bottom: 1px solid var(--ds-color-warning-border-subtle);
        color: var(--ds-color-warning-text-default);
    }

    .preview-bar p {
        flex: 1 1 20rem;
    }

    .content {
        flex: 1;
        width: 100%;
        max-width: 140rem;
        margin-inline: auto;
        padding: var(--ds-size-2) var(--ds-size-2) var(--ds-size-6);
    }

    /* Pages with their own max-width sit in the middle. */
    .content > :global(main) {
        margin-inline: auto;
    }

    @media (max-width: 768px) {
        .sidebar { display: none; }
        .menu-btn { display: inline-flex; }
        .topbar { padding: var(--ds-size-2) var(--ds-size-4); }
        .preview-bar { padding-inline: var(--ds-size-4); }
        .content { padding: var(--ds-size-2) 0 var(--ds-size-6); }
    }
</style>
