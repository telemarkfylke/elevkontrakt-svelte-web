<script>
    /**
     * Shows its content only to users with one of `roles`, and nothing otherwise - for gating part
     * of a page. Like AdminOnly, it decides what is shown; the API enforces access.
     */
    import { getElevkontraktToken } from '$lib/useApi.js'
    import { hasAnyRole } from '$lib/helpers/roles.js'

    export let roles = []
</script>

{#await getElevkontraktToken(true) then token}
    {#if hasAnyRole(token, roles)}
        <slot {token} />
    {/if}
{:catch}
    <!-- Nothing to show: the page around it still works without this piece. -->
{/await}
