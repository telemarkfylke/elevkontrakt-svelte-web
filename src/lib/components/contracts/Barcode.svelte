<script>
    // The elev's username as a CODE39 barcode. A click copies the username and shows a large one for the scanner.
    import JsBarcode from 'jsbarcode'
    import { getStudentShortName } from '$lib/helpers/studentShortName'

    export let upn = ''
    export let large = false // bigger in delivery mode

    const id = `barcode-${Math.random().toString(36).slice(2, 9)}`
    let copied = false

    $: shortName = upn ? getStudentShortName(upn) : ''
    $: src = shortName ? render(shortName, 0) : ''
    $: zoomSrc = shortName ? render(shortName, 12) : '' // white margin so the scanner can read it

    function render (value, margin) {
        try {
            const canvas = document.createElement('canvas')
            JsBarcode(canvas, value, { format: 'CODE39', displayValue: false, margin, background: '#ffffff' })
            return canvas.toDataURL('image/png')
        } catch {
            return ''
        }
    }

    async function copy () {
        try { await navigator.clipboard.writeText(shortName) } catch { /* the popover still shows the barcode */ }
        copied = true
        setTimeout(() => { copied = false }, 1500)
    }
</script>

{#if src}
    <button class="barcode" class:large type="button" popovertarget={id} aria-label="Kopier brukernavn {shortName}" on:click={copy}>
        <img {src} alt="" />
    </button>
    <div class="ds-popover zoom" popover {id} data-placement="top">
        <img src={zoomSrc} alt="Strekkode for {shortName}" />
        <p class="ds-paragraph" data-size="sm">{shortName}{copied ? ' · kopiert' : ''}</p>
    </div>
{/if}

<style>
    .barcode {
        all: unset;
        cursor: pointer;
        display: inline-block;
        padding: 2px 4px;
        border-radius: var(--ds-border-radius-sm);
    }

    .barcode img {
        display: block;
        height: 2.6rem;
        width: auto;
        max-width: none;
    }

    .barcode.large img { height: 3.6rem; }

    .barcode:hover img { outline: 1px solid var(--ds-color-accent-border-default); }

    .barcode:focus-visible { outline: 3px solid var(--ds-color-focus-outer); }

    .zoom {
        width: max-content;
        max-width: min(90vw, 30rem);
        text-align: center;
        background: #fff;
        color: #000;
    }

    .zoom img {
        display: block;
        width: 100%;
        height: 6rem;
        object-fit: contain;
    }
</style>
