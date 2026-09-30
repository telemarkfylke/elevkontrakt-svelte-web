<script>
    // Tag for a rate or invoice status, coloured the same way everywhere (see helpers/status.js).
    import DsTag from './ds/DsTag.svelte'
    import { statusInfo } from '$lib/helpers/status.js'

    export let status = ''
    export let kind = 'rate' // rate | invoice
    export let size = 'sm'

    $: info = statusInfo(status, kind)
</script>

<DsTag color={info.color} {size}>{info.label}</DsTag>
