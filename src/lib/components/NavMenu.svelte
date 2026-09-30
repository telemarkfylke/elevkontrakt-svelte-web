<script>
    // The main menu, used in the sidebar and in the mobile drawer.
    export let groups = [] // [{ title, items: [{ title, href, icon }] }]
    export let bottom = [] // items pinned to the bottom, e.g. Hjelp
    export let path = '/'
    export let id = 'nav'

    const isActive = (href, path) => href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)
</script>

<nav class="nav" aria-label="Hovedmeny">
    {#each groups as group, i (group.title)}
        <div class="nav-group" role="group" aria-labelledby="{id}-group-{i}">
            <p class="group-title" id="{id}-group-{i}">{group.title}</p>
            {#each group.items as item (item.href)}
                <a class="nav-item" href={item.href} aria-current={isActive(item.href, path) ? 'page' : undefined}>
                    <span class="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                    <span>{item.title}</span>
                </a>
            {/each}
        </div>
    {/each}
    {#if bottom.length}
        <div class="nav-group nav-bottom">
            {#each bottom as item (item.href)}
                <a class="nav-item" href={item.href} aria-current={isActive(item.href, path) ? 'page' : undefined}>
                    <span class="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                    <span>{item.title}</span>
                </a>
            {/each}
        </div>
    {/if}
</nav>

<style>
    .nav {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .nav-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .group-title {
        padding: 0 var(--ds-size-3) var(--ds-size-2);
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--ds-color-accent-text-subtle);
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: var(--ds-size-3);
        padding: var(--ds-size-2) var(--ds-size-3);
        border-radius: var(--ds-border-radius-md);
        color: var(--ds-color-accent-text-default);
        text-decoration: none;
    }

    .nav-item:hover {
        background: var(--ds-color-accent-surface-hover);
    }

    .nav-item:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
        outline-offset: 1px;
        box-shadow: inset 0 0 0 2px var(--ds-color-focus-inner);
    }

    .nav-item[aria-current='page'] {
        font-weight: 700;
        background: var(--ds-color-accent-surface-tinted);
        box-shadow: inset 4px 0 0 var(--ds-color-accent-base-default);
    }

    .nav-item .material-symbols-outlined {
        font-size: 1.35rem;
    }

    .nav-item[aria-current='page'] .material-symbols-outlined {
        font-variation-settings: 'FILL' 1;
    }

    .nav-bottom {
        margin-top: auto;
        padding-top: var(--ds-size-4);
        border-top: 1px solid var(--ds-color-accent-border-subtle);
    }
</style>
