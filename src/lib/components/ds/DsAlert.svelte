<script>
    /**
     * Designsystemet alert. `color` says who must act: danger = the admin, warning = someone else
     * (e.g. an archive administrator), info = context.
     */
    export let color = 'info' // info | warning | danger | success
    export let heading = ''
</script>

<div class="ds-alert" data-color={color} role={color === 'danger' ? 'alert' : 'status'}>
    <div>
        {#if heading}
            <p class="ds-heading" data-size="2xs">{heading}</p>
        {/if}
        <slot />
    </div>
</div>
