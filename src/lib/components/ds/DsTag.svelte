<script>
    // Designsystemet tag. color is a theme colour: success, danger, warning, info, neutral, accent, korn, plomme …
    export let color = 'neutral'
    export let size = 'sm'
    export let variant = undefined // outline
</script>

<span class="ds-tag" data-color={color} data-size={size} data-variant={variant}><slot /></span>

<style>
    .ds-tag {
        font-weight: 600;
        white-space: nowrap;
    }
</style>
