// JavaScript to handle opening portfolio items full-screen

function openLightbox(imageSrc,descriptionText) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');

    // Only attempts to load if you have a real image file name

    if(imageSrc && imageSrc !== '')
{
        lightboxImg.src = imageSrc;
    }
    
    // Inject the description text into the popup window
    	if(descriptionText) {
        	lightboxCaption.textContent = descriptionText;
    	} else {
        lightboxCaption.textContent = ""; 
			// Leaves it blank if you don't provide a description
    }
    
    lightbox.style.display = 'flex';
}
 

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

