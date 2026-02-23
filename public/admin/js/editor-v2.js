// ===== SIMPLE AND RELIABLE EDITOR IMPLEMENTATION =====

function setupEditor() {
    const editor = document.getElementById('body');
    const toolbar = document.getElementById('editorToolbar');
    const colorPicker = document.getElementById('textColor');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageUploadModal = document.getElementById('imageUploadModal');
    const modalImageInput = document.getElementById('modalImageInput');
    const insertImageBtn = document.getElementById('insertImageBtn');
    const cancelImageBtn = document.getElementById('cancelImageBtn');

    if (!editor || !toolbar) {
        console.error('Editor or toolbar not found');
        return;
    }

    console.log('Setting up editor with delegated event listeners');

    // Use event delegation on toolbar - capture all clicks
    toolbar.addEventListener('click', function (e) {
        if (!e.target.closest('button.editor-btn')) return;

        e.preventDefault();
        const btn = e.target.closest('button.editor-btn');
        const command = btn.dataset.command;
        const value = btn.dataset.value || null;

        console.log('Toolbar button clicked:', command, value);
        editor.focus();

        if (command === 'createLink') {
            const selection = window.getSelection();
            const selectedText = selection.toString();

            if (!selectedText) {
                alert('Please select text first to create a link');
                return;
            }

            const url = prompt('Enter URL:', 'https://');
            if (url && url.trim()) {
                const linkHtml = `<a href="${url}" target="_blank" style="color: #1976d2; text-decoration: underline;">${selectedText}</a>`;
                document.execCommand('insertHTML', false, linkHtml);
            }
        } else if (command === 'insertImage') {
            // Open the image upload modal instead of requiring a URL
            if (typeof imageUploadModal !== 'undefined' && imageUploadModal) {
                imageUploadModal.style.display = 'flex';
            } else {
                // fallback: allow URL prompt if modal not present
                const url = prompt('Enter Image URL:', 'https://');
                if (url) {
                    const imgHtml = `<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 15px 0; clear: both;">`;
                    document.execCommand('insertHTML', false, imgHtml);
                }
            }
        } else if (command === 'formatBlock' && (value === 'h2' || value === 'h3')) {
            // Handle H2 and H3 specially to only wrap selected text
            const selection = window.getSelection();
            const selectedText = selection.toString();

            if (!selectedText) {
                alert('Please select text first to format as heading');
                return;
            }

            const tag = value;
            const headingHtml = `<${tag} style="margin: 15px 0; font-weight: 700; color: var(--text-main, #333);">${selectedText}</${tag}>`;
            document.execCommand('insertHTML', false, headingHtml);
        } else if (command) {
            document.execCommand(command, false, value);
        }

        editor.focus();
    });

    // Color picker
    if (colorPicker) {
        colorPicker.addEventListener('change', function () {
            editor.focus();
            document.execCommand('foreColor', false, this.value);
            editor.focus();
        });
    }

    // Upload image button
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            imageUploadModal.style.display = 'flex';
        });
    }

    // Cancel button
    if (cancelImageBtn) {
        cancelImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            imageUploadModal.style.display = 'none';
            modalImageInput.value = '';
        });
    }

    // Click outside modal to close
    if (imageUploadModal) {
        imageUploadModal.addEventListener('click', function (e) {
            if (e.target === imageUploadModal) {
                imageUploadModal.style.display = 'none';
                modalImageInput.value = '';
            }
        });
    }

    // Insert image button
    if (insertImageBtn) {
        insertImageBtn.addEventListener('click', function (e) {
            e.preventDefault();

            const file = modalImageInput.files[0];
            if (!file) {
                alert('Please select an image file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB limit');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const width = document.getElementById('imgWidth').value || 400;
                const height = document.getElementById('imgHeight').value || 300;
                const alignment = document.getElementById('imgAlignment').value;

                const base64Data = e.target.result;
                const filename = file.name;

                // Upload image to server
                fetch('/api/media/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ base64Data, filename })
                }).then(response => response.json()).then(data => {
                    if (!data.url) {
                        alert('Upload failed');
                        return;
                    }

                    const imageUrl = data.url;
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

                    const imgHtml = `${wrapper}<img src="${imageUrl}" style="width: ${width}px; height: ${height}px; object-fit: cover; ${imgStyle};">${closeWrapper}`;

                    editor.focus();
                    document.execCommand('insertHTML', false, imgHtml);

                    imageUploadModal.style.display = 'none';
                    modalImageInput.value = '';
                    document.getElementById('imgWidth').value = 400;
                    document.getElementById('imgHeight').value = 300;
                    document.getElementById('imgAlignment').value = 'none';

                    if (window.showSuccess) showSuccess('Image inserted successfully');
                }).catch(err => {
                    console.error('Upload error:', err);
                    if (window.showError) showError('Failed to upload image');
                });
            };
            reader.readAsDataURL(file);
        });
    }

    console.log('Editor setup complete');
}

// Initialize when the page loads and whenever the create-article section is shown
document.addEventListener('DOMContentLoaded', function () {
    setupEditor();
    console.log('Initial editor setup done');
});
