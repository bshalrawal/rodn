// ===== ENHANCED EDITOR IMPLEMENTATION WITH IMAGE UPLOAD =====
let editorInitialized = false;

function initializeEditor() {
    const editor = document.getElementById('body');
    const toolbar = document.getElementById('editorToolbar');
    const colorPicker = document.getElementById('textColor');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageUploadInput = document.getElementById('imageUploadInput');
    const imageUploadModal = document.getElementById('imageUploadModal');
    const modalImageInput = document.getElementById('modalImageInput');
    const insertImageBtn = document.getElementById('insertImageBtn');
    const cancelImageBtn = document.getElementById('cancelImageBtn');

    if (!editor || !toolbar) {
        console.error('Editor elements not found', {editor: !!editor, toolbar: !!toolbar});
        return;
    }

    // Don't re-initialize if already done
    if (editorInitialized) {
        console.log('Editor already initialized');
        return;
    }

    console.log('Initializing enhanced editor...');

    // Attach click handlers to all toolbar buttons (find them anywhere in the toolbar)
    const allButtons = toolbar.querySelectorAll('button.editor-btn');
    console.log('Found buttons:', allButtons.length);
    
    allButtons.forEach((btn, index) => {
        console.log(`Button ${index}:`, btn.dataset.command, btn.textContent);
        
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const command = this.dataset.command;
            const value = this.dataset.value || null;

            console.log('Editor button clicked:', command, value);

            editor.focus();

            if (command === 'createLink') {
                const url = prompt('Enter URL:', 'https://');
                if (url) document.execCommand('createLink', false, url);
            } else if (command === 'insertImage') {
                // Open the image upload modal instead of requiring a URL
                if (typeof imageUploadModal !== 'undefined') {
                    imageUploadModal.style.display = 'flex';
                } else {
                    // fallback: allow URL prompt if modal not present
                    const url = prompt('Enter Image URL:', 'https://');
                    if (url) {
                        const imgHtml = `<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 15px 0; clear: both;">`;
                        document.execCommand('insertHTML', false, imgHtml);
                    }
                }
            } else {
                document.execCommand(command, false, value);
            }

            editor.focus();
        });
    });

    // Color picker
    if (colorPicker) {
        colorPicker.addEventListener('change', function () {
            editor.focus();
            document.execCommand('foreColor', false, this.value);
            editor.focus();
        });
    }

    // Image upload button
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            imageUploadModal.style.display = 'flex';
        });
    }

    // Cancel image upload
    if (cancelImageBtn) {
        cancelImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            imageUploadModal.style.display = 'none';
            modalImageInput.value = '';
        });
    }

    // Close modal when clicking outside
    imageUploadModal.addEventListener('click', function (e) {
        if (e.target === imageUploadModal) {
            imageUploadModal.style.display = 'none';
            modalImageInput.value = '';
        }
    });

    // Insert image from upload
    if (insertImageBtn) {
        insertImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            
            const file = modalImageInput.files[0];
            if (!file) {
                showWarning('Please select an image file');
                return;
            }

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError('File size exceeds 5MB limit');
                return;
            }

            // Read file as data URL
            const reader = new FileReader();
            reader.onload = function (e) {
                const width = document.getElementById('imgWidth').value || 400;
                const height = document.getElementById('imgHeight').value || 300;
                const alignment = document.getElementById('imgAlignment').value;

                const dataUrl = e.target.result;
                let imgStyle = `max-width: 100%; height: auto; display: block; margin: 15px 0;`;
                let wrapper = '';
                let closeWrapper = '';

                if (alignment === 'left') {
                    imgStyle += ' float: left; margin-right: 15px; margin-bottom: 10px;';
                } else if (alignment === 'center') {
                    wrapper = '<div style="text-align: center;">';
                    closeWrapper = '</div>';
                } else if (alignment === 'right') {
                    imgStyle += ' float: right; margin-left: 15px; margin-bottom: 10px;';
                }

                const imgHtml = `${wrapper}<img src="${dataUrl}" style="width: ${width}px; height: ${height}px; object-fit: cover; ${imgStyle};">${closeWrapper}`;
                
                editor.focus();
                document.execCommand('insertHTML', false, imgHtml);

                // Reset modal
                imageUploadModal.style.display = 'none';
                modalImageInput.value = '';
                document.getElementById('imgWidth').value = 400;
                document.getElementById('imgHeight').value = 300;
                document.getElementById('imgAlignment').value = 'none';

                showSuccess('Image inserted successfully');
            };
            reader.readAsDataURL(file);
        });
    }

    console.log('Enhanced editor initialized successfully!');
    editorInitialized = true;
}

// Make sure editor initializes when create-article section is shown
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all DOM elements to be ready
    setTimeout(function() {
        console.log('DOM loaded, editor functions available');
    }, 100);
});


