<script>
    // Contract at a glance: Signert → PC utlevert → Innlevert/kjøpt ut, and how many rates are paid.
    import DsSteps from './ds/DsSteps.svelte'
    import PaymentBar from './PaymentBar.svelte'
    import { isTrue } from '$lib/helpers/status.js'
    import { formatShortDate } from '$lib/helpers/formatDate.js'

    export let contract

    $: pc = contract?.pcInfo ?? {}
    $: type = String(contract?.unSignedskjemaInfo?.kontraktType ?? contract?.signedSkjemaInfo?.kontraktType ?? '').toLowerCase()

    // The PC ends one of two ways. Until one is registered, the last step names both.
    $: ending = isTrue(pc.boughtOut)
        ? { label: 'Kjøpt ut', done: true, date: formatShortDate(pc.buyOutDate), icon: 'shopping_cart' }
        : isTrue(pc.returned)
            ? { label: 'Innlevert', done: true, date: formatShortDate(pc.returnedDate), icon: 'assignment_return' }
            : { label: 'Innlevert eller kjøpt ut', done: false }

    $: steps = [
        { label: 'Signert', done: isTrue(contract?.isSigned), date: formatShortDate(contract?.signedSkjemaInfo?.createdTimeStamp) },
        { label: 'PC utlevert', done: isTrue(pc.released), date: formatShortDate(pc.releasedDate) },
        ending
    ]

    $: statuses = ['rate1', 'rate2', 'rate3'].map(key => contract?.fakturaInfo?.[key]?.status)
</script>

<div class="summary">
    <div>
        <span class="heading">Avtaleforløp</span>
        <DsSteps {steps} label="Avtaleforløp" />
    </div>
    <div>
        <span class="heading">Betaling</span>
        {#if type === 'låneavtale'}
            <p class="note">Låneavtale, faktureres ikke</p>
        {:else}
            <PaymentBar {statuses} />
        {/if}
    </div>
</div>

<style>
    .summary {
        display: grid;
        grid-template-columns: minmax(0, 3fr) minmax(12rem, 2fr);
        gap: var(--ds-size-4) 2.5rem;
        padding: var(--ds-size-4) var(--ds-size-5);
        background: var(--ds-color-accent-background-tinted);
        border-radius: var(--ds-border-radius-lg);
    }

    @media (max-width: 700px) {
        .summary { grid-template-columns: 1fr; }
    }

    .heading {
        display: block;
        margin-bottom: var(--ds-size-3);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--ds-color-accent-text-subtle);
    }

    .note {
        font-size: 0.9rem;
        color: var(--ds-color-neutral-text-subtle);
    }
</style>
