import { getStudentShortName } from "./studentShortName";

export function clickToCopy(node, target) {
	async function copyText() {
        let text
        if(target === 'img') {        
            if(!node.src) {
                console.error('No image source found on the node:', node)
                return;
            }
            // If target is an image, copy the src attribute
            if(!target) {
                console.error('No target specified for clickToCopy:', node)
                return;
            }
            // Get the alt attribute of the image
            if(node.alt) {
                target = node.alt
                
                // Keep only student shortname.
                text = getStudentShortName(target.split(' ')[1])
            } else {
                console.error('No alt attribute found on the image:', node)
                return;
            }
        } else {
            text = target ? document.querySelector(target).innerText : node.innerText
        }

         try {
            await navigator.clipboard.writeText(text)
            node.dispatchEvent(
                new CustomEvent('copysuccess', {
                            bubbles: true
                        })
            )
        } catch(error) {
            node.dispatchEvent(
                new CustomEvent('copyerror', {
                    bubbles: true,
                    detail: error
                })
            )
        }
    
	}
	
	node.addEventListener('click', copyText)
	
	return {
		destroy() {
			node.removeEventListener('click', copyText)
		}
	}
}