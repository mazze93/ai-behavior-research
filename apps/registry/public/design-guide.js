"use strict";
const button = document.getElementById('color');
const spectrum = document.getElementById('spectrum');
if (button instanceof HTMLButtonElement && spectrum instanceof HTMLElement) {
    button.addEventListener('click', () => {
        const developed = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(developed));
        spectrum.classList.toggle('color', developed);
        button.textContent = developed ? 'Return to monochrome' : 'Develop the spectrum';
    });
}
