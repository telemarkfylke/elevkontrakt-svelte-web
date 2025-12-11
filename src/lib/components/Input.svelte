<script>
    export let type = 'text';
    export let disabled = false;
    export let value = type === 'text' ? '' : null;
    export let error = '';
    export let label = '';
    export let placeholder = '';
    export let attachment = null;
    export let keypressEvent = null
    export let maxlength
  
    function handleInput({ target: t }) {
      if (type === 'number') {
        value = t.value === '' ? null : t.valueAsNumber;
      } else {
        value = t.value;
      }
    }

    const readFileAsDataURL = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
    }
    
    const handleFileUpload = async (event) => {
        const file = event?.target?.files[0]
        if (file) {
          attachment = file;
          const dataUrl = await readFileAsDataURL(file)
          value = dataUrl.split(',')[1]
          return { 
            name: file.name,
            dataUrl: dataUrl.split(',')[1]
          };
        }
    };
    
  </script>
  
  
  <label class="block">
      {#if label}
          <span class="block">{label}</span>
      {/if}
      <input
        class="block input"
        accept="{type === 'file' ? 'application/pdf' : ''}"
        class:error
          {disabled}
          {type}
          {placeholder}
          value="{type === 'file' ? '' : value}"
          {maxlength}
          on:keypress={keypressEvent}
          on:input={handleInput}
          on:input
          on:blur
          on:change={handleFileUpload}
      />
      {#if error}
          <span class="block error-text">{error}</span>
      {/if}
  </label>
  
  <style>
    .input {
      border-radius: 4px;
      padding: 6px 10px;
      margin: 0;
    }
    
    .block {
      display: block;
    }
  
    .error {
      border-color: #f55;
    }
  
    .error-text {
      color: #f55;
    }
  </style>