<script>
    import { goto } from '$app/navigation';
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import { formatDate } from '$lib/helpers/formatDate';
    import { returnType } from '$lib/helpers/returnInvoiceType';
    import { getInvoices, getElevkontraktToken } from '$lib/useApi';
    import { onMount } from 'svelte'

    let invoices = []
    let error = null

    // Visibility states for different invoice statuses
    let showInvoiced = false
    let showNotInvoiced = false
    let showPaid = false
    let showOther = false

    const handleVisibility = (status, i) => {
        if (status === 'invoiced' && !i) {
            showInvoiced = !showInvoiced
        } else if (status === 'not-invoiced' && !i) {
            showNotInvoiced = !showNotInvoiced
        } else if (status === 'paid' && !i) {
            showPaid = !showPaid
        } else if (status === 'other' && !i) {
            showOther = !showOther
        }
    }

    
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.billing-readwrite', 'elevkontrakt.billing-read'].includes(r))}
            {#await getInvoices(token.upn)}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then data}
                {#if data.status === 200}
                    <div class="contract-card">
                        <h1>
                            <span class="material-symbols-outlined">receipt</span>
                            Fakturaoversikt
                        </h1>
                        <div class="results">
                            <div class="contract-overview">
                                <h2 class="invoiced">
                                    <div class="header-with-buttons">
                                        <div class="header-title">
                                            Fakturert ({data.data.filter(invoice => invoice.status === 'Fakturert').length})
                                        </div>
                                        <button class="toggle-button" on:click={() => handleVisibility('invoiced')}>
                                            <span class="material-symbols-outlined">
                                                {showInvoiced ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </h2>
                                {#each data.data as invoice}
                                    {#if invoice.status === 'Fakturert' && showInvoiced}
                                        <div class="info-section">
                                            <h3>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        <span>Elev - {invoice.student.navn}</span>
                                                    </div>
                                                    <div class="button-group">
                                                    <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                        <span class="material-symbols-outlined">contract</span>
                                                    </button>
                                                </div>
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Navn på ansvarlig:</label>
                                                    <span class="value">{invoice.recipient.navn}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Opprettet:</label>
                                                    <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Type faktura:</label>
                                                    <span class="value">{returnType(invoice.type)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                            <br>
                            <div class="contract-overview">
                                <h2 class="notinvoiced">
                                    <div class="header-with-buttons">
                                        <div class="header-title">
                                            Ikke Fakturert ({data.data.filter(invoice => invoice.status === 'Ikke Fakturert').length})
                                        </div>
                                        <button class="toggle-button" on:click={() => handleVisibility('not-invoiced')}>
                                            <span class="material-symbols-outlined">
                                                {showNotInvoiced ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </h2>
                                {#each data.data as invoice}
                                    {#if invoice.status === 'Ikke Fakturert' && showNotInvoiced}
                                        <div class="info-section">
                                            <h3>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        <span>Elev - {invoice.student.navn}</span>
                                                    </div>
                                                    <div class="button-group">
                                                    <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                        <span class="material-symbols-outlined">contract</span>
                                                    </button>
                                                </div>
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Navn på ansvarlig:</label>
                                                    <span class="value">{invoice.recipient.navn}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Opprettet:</label>
                                                    <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Type faktura:</label>
                                                    <span class="value">{returnType(invoice.type)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                            <br>
                            <div class="contract-overview">
                                <h2 class="paid">
                                    <div class="header-with-buttons">
                                        <div class="header-title">
                                            Betalt ({data.data.filter(invoice => invoice.status === 'Betalt').length})
                                        </div>
                                        <button class="toggle-button" on:click={() => handleVisibility('paid')}>
                                            <span class="material-symbols-outlined">
                                                {showPaid ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </h2>
                                {#each data.data as invoice}
                                    {#if invoice.status === 'Betalt' && showPaid}
                                        <div class="info-section">
                                            <h3>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        <span>Elev - {invoice.student.navn}</span>
                                                    </div>
                                                    <div class="button-group">
                                                    <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                        <span class="material-symbols-outlined">contract</span>
                                                    </button>
                                                </div>
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Navn på ansvarlig:</label>
                                                    <span class="value">{invoice.recipient.navn}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Opprettet:</label>
                                                    <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Type faktura:</label>
                                                    <span class="value">{returnType(invoice.type)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                            <br>
                            <div class="contract-overview">
                                <h2 class="other">
                                    <div class="header-with-buttons">
                                        <div class="header-title">
                                            Andre ({data.data.filter(invoice => invoice.status !== 'Betalt' && invoice.status !== 'Fakturert' && invoice.status !== 'Ikke Fakturert').length})
                                        </div>
                                        <button class="toggle-button" on:click={() => handleVisibility('other')}>
                                            <span class="material-symbols-outlined">
                                                {showOther ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </h2>
                                {#each data.data as invoice}
                                    {#if invoice.status !== 'Betalt' && invoice.status !== 'Fakturert' && invoice.status !== 'Ikke Fakturert' && showOther}
                                        <div class="info-section">
                                            <h3>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        <span>Elev - {invoice.student.navn}</span>
                                                    </div>
                                                    <div class="button-group">
                                                    <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                        <span class="material-symbols-outlined">contract</span>
                                                    </button>
                                                </div>
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Navn på ansvarlig:</label>
                                                    <span class="value">{invoice.recipient.navn}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Opprettet:</label>
                                                    <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Type faktura:</label>
                                                    <span class="value">{returnType(invoice.type)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if data.status === 200 && data.data.length === 0}
                    <p>Ingen fakturaer funnet.</p>
                {:else}
                    <p class="error">Feil ved innhenting av fakturaer: {data.error}</p>
                {/if}
            {:catch invoiceError}
                <p class="error">Feil ved innhenting av fakturaer: {invoiceError.message}</p>
            {/await}
        {:else}
            <p class="error">Du har ikke tilgang til å se fakturaer.</p>
        {/if}
    {:catch tokenError}
        <p class="error">Feil ved innhenting av token: {tokenError.message}</p>
    {/await}
</main>

<style>
    main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    h1 {
        color: var(--gress-80);
        margin-bottom: 1rem;
    }

    p {
        margin-bottom: 1rem;
        color: var(--vann-70, #333);
        line-height: 1.5;
    }

    .info-text {
        background-color: var(--gress-5, #f8fffe);
        border-left: 4px solid var(--gress-60);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }

    button {
        padding: 0.75rem 1.5rem;
        background-color: var(--gress-60);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }


    button:hover:not(:disabled) {
        background-color: var(--gress-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .button-remove {
        padding: 0.75rem 1.5rem;
        background-color: var(--nype-60);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .button-remove:hover:not(:disabled) {
        background-color: var(--nype-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .contract-card {
        margin-bottom: 3rem;
    }

    .results {
        margin-top: 2rem;
    }

    .contract-overview {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .contract-overview h2 {
        background: linear-gradient(135deg, var(--gress-60), var(--gress-70));
        color: white;
        padding: 2rem;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;

        &.invoiced {
            background: linear-gradient(135deg, var(--korn-60), var(--korn-70));
        }
        &.paid {
            background: linear-gradient(135deg, var(--gress-60), var(--gress-70));
        }
        &.other {
            background: linear-gradient(135deg, var(--plomme-60), var(--plomme-70));
        }
        &.notinvoiced {
            background: linear-gradient(135deg, var(--nype-60), var(--nype-70));
        }
    }

    .info-section {
        border-bottom: 1px solid var(--gress-10);
        padding: 2rem;
    }

    .info-section:last-child {
        border-bottom: none;
    }

    .info-section h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--gress-80);
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .info-section h3 .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }

    .info-section h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--gress-80);
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .info-section h4 .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-item label {
        font-weight: 600;
        color: var(--gress-70);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .info-item .value {
        padding: 0.75rem;
        background-color: var(--gress-5, #f8fffe);
        border-radius: 6px;
        border-left: 3px solid var(--gress-30);
        font-size: 1rem;
        min-height: 1.2rem;
    }

    .info-note {
        margin: 0.5rem;
        font-size: 0.9rem;
        font-style: italic;
    }

    .value.contract-type {
        background-color: var(--korn-10);
        border-left-color: var(--korn-50);
        font-weight: 600;
    }

    .value.uuid {
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        word-break: break-all;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-radius: 8px;
        background-color: var(--gress-5);
        border: 1px solid var(--gress-20);
    }

    .status-item label {
        font-weight: 600;
        color: var(--gress-80);
    }

    .status-badge {
        padding: 0.4rem 0.8rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .status-item.success .status-badge {
        background-color: var(--gress-20);
        color: var(--gress-80);
        border: 1px solid var(--gress-40);
    }

    .status-item.danger .status-badge {
        background-color: var(--nype-20, #fdd);
        color: var(--nype-80, #800);
        border: 1px solid var(--nype-40, #faa);
    }

    .status-item.warning .status-badge {
        background-color: var(--korn-20);
        color: var(--korn-80);
        border: 1px solid var(--korn-40);
    }

    .status-item.info .status-badge {
        background-color: var(--himmel-20, #e6f3ff);
        color: var(--himmel-80, #0066cc);
        border: 1px solid var(--himmel-40, #99d6ff);
    }

    .billing-timeline {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .billing-period {
        background-color: var(--gress-5);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--gress-20);
    }

    .period-header {
        background-color: var(--gress-10);
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--gress-20);
    }

    .period-header h4 {
        margin: 0;
        color: var(--gress-80);
        font-weight: 600;
    }

    .period-details {
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .detail-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--gress-70);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .detail-value {
        padding: 0.5rem;
        background-color: white;
        border-radius: 4px;
        border-left: 2px solid var(--gress-30);
        font-size: 0.9rem;
    }

    .pc-status {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .pc-status-item {
        background-color: var(--gress-5);
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid var(--gress-20);
        transition: all 0.2s ease;
    }

    .pc-status-item:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }

    .pc-status-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        color: var(--gress-80);
        font-weight: 600;
    }

    .pc-status-header .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }

    .pc-status-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .date-info {
        font-size: 0.85rem;
        color: var(--gress-60);
        font-style: italic;
    }

    .error-message {
        background-color: var(--nype-10, #ffe5e5);
        border-left: 4px solid var(--nype-60, #ff4d4d);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }

    .header-with-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }


    .button-group {
        display: flex;
        gap: 1rem;
    }

    .header-title {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .toggle-button {
        background-color: transparent;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
    }

    .toggle-button:hover:not(:disabled) {
        background-color: transparent;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .not-invoiced {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
    }

    /* Extra fields styling in billing */
    .extra-field-input {
        min-width: 200px;
        flex: 1;
    }

    .extra-field-input :global(input) {
        font-size: 0.9rem;
        padding: 0.4rem;
        border: 1px solid var(--vann-30);
        border-radius: 4px;
        background-color: var(--vann-5);
    }

    .extra-field-input :global(input):focus {
        border-color: var(--vann-60);
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--vann-60), 0.2);
    }

    /* Responsive design */
    @media (max-width: 768px) {
        main {
            padding: 1rem;
        }

        .info-grid {
            grid-template-columns: 1fr;
        }

        .status-grid {
            grid-template-columns: 1fr;
        }

        .pc-status {
            grid-template-columns: 1fr;
        }

        .period-details {
            grid-template-columns: 1fr;
        }
    }

    /* Material Icons */
    .material-symbols-outlined {
        font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 24;
    }
</style>