<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let type = 'info'; // 'success', 'error', 'warning', 'info'
  export let title = '';
  export let message = '';
  export let dismissible = false;
  export let autoClose = false;
  export let autoCloseDelay = 5000; // milliseconds
  export let icon = true;
  export let size = 'medium'; // 'small', 'medium', 'large'
  export let position = 'static'; // 'static', 'fixed-top', 'fixed-bottom'
  
  let visible = true;
  let autoCloseTimer;
  
  // Auto close functionality
  $: if (autoClose && visible) {
    autoCloseTimer = setTimeout(() => {
      close();
    }, autoCloseDelay);
  }
  
  function close() {
    visible = false;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    dispatch('close');
  }
  
  // Icon mapping for different alert types
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  // Clean up timer on component destroy
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
  });
</script>

{#if visible}
  <div 
    class="alert alert-{type} alert-{size} alert-{position}"
    role="alert"
    aria-live="polite"
  >
    <div class="alert-content">
      {#if icon}
        <div class="alert-icon">
          {icons[type]}
        </div>
      {/if}
      
      <div class="alert-text">
        {#if title}
          <div class="alert-title">{title}</div>
        {/if}
        {#if message}
          <div class="alert-message">{message}</div>
        {/if}
        {#if $$slots.default}
          <div class="alert-slot">
            <slot />
          </div>
        {/if}
      </div>
      
      {#if dismissible}
        <button 
          class="alert-close" 
          on:click={close}
          aria-label="Lukk varsel"
          type="button"
        >
          ×
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .alert {
    border-radius: 8px;
    border: 1px solid;
    margin-bottom: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  
  .alert-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  
  .alert-icon {
    font-size: 18px;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .alert-text {
    flex: 1;
    min-width: 0;
  }
  
  .alert-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .alert-message {
    line-height: 1.5;
  }
  
  .alert-slot {
    margin-top: 8px;
  }
  
  .alert-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    margin: 0;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
  }
  
  .alert-close:hover {
    opacity: 1;
  }
  
/* Alert Types using app.css color palette */
.alert-success {
    background-color: var(--app-success-bg, var(--gress-10));
    border-color: var(--app-success-border, var(--gress-60));
    color: var(--app-success-text, var(--gress-80));
}

.alert-success .alert-icon {
    color: var(--app-success, var(--gress-80));
}

.alert-error {
    background-color: var(--app-error-bg, var(--nype-10));
    border-color: var(--app-error-border, var(--nype-60));
    color: var(--app-error-text, var(--nype-80));
}

.alert-error .alert-icon {
    color: var(--app-error, var(--nype-80));
}

.alert-warning {
    background-color: var(--app-warning-bg, var(--korn-10));
    border-color: var(--app-warning-border, var(--korn-60));
    color: var(--app-warning-text, var(--korn-80));
}

.alert-warning .alert-icon {
    color: var(--app-warning, var(--korn-80));
}

.alert-info {
    background-color: var(--app-info-bg, var(--vann-10));
    border-color: var(--app-info-border, var(--vann-60));
    color: var(--app-info-text, var(--vann-80));
}

.alert-info .alert-icon {
    color: var(--app-info, var(--vann-80));
}
  /* Sizes */
  .alert-small {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .alert-medium {
    padding: 12px 16px;
    font-size: 16px;
  }
  
  .alert-large {
    padding: 16px 20px;
    font-size: 18px;
  }
  
  /* Positions */
  .alert-fixed-top {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    max-width: 500px;
    z-index: 1000;
    width: 90%;
    margin-bottom: 0;
  }
  
  .alert-fixed-bottom {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 90%;
    max-width: 500px;
    margin-bottom: 0;
  }
  
  /* Animation */
  .alert {
    animation: slideIn 0.7s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-100%) translateX(-50%);
    }
    to {
      opacity: 1;
      transform: translateY(0) translateX(-50%);
    }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .alert-fixed-top,
    .alert-fixed-bottom {
      width: 95%;
      max-width: none;
    }
    
    .alert-large {
      padding: 14px 18px;
      font-size: 16px;
    }
  }
</style>
