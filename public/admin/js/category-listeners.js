// ===== CATEGORY MANAGEMENT EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function () {
    // Add Category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const form = document.getElementById('addCategoryForm');
            if (form) {
                form.style.display = 'block';
            }
        });
    }

    // Create Category button
    const createCategoryBtn = document.getElementById('createCategoryBtn');
    if (createCategoryBtn) {
        createCategoryBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const name = document.getElementById('cat_name').value;
            let slug = document.getElementById('cat_slug').value;
            const description = document.getElementById('cat_description').value;

            if (!name) {
                showWarning('Category name is required');
                return;
            }

            if (!slug && window.generateSlug) {
                slug = window.generateSlug(name);
            }

            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ name, slug, description })
                });

                if (response.ok) {
                    showSuccess('Category created successfully!');
                    document.getElementById('addCategoryForm').style.display = 'none';
                    document.getElementById('cat_name').value = '';
                    document.getElementById('cat_slug').value = '';
                    document.getElementById('cat_description').value = '';
                    if (window.loadCategories) window.loadCategories();
                } else {
                    const error = await response.json();
                    showError('Error: ' + error.error);
                }
            } catch (error) {
                showError('Network error. Please try again.');
            }
        });
    }

    // Cancel Category button
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const form = document.getElementById('addCategoryForm');
            if (form) {
                form.style.display = 'none';
                document.getElementById('cat_name').value = '';
                document.getElementById('cat_slug').value = '';
                document.getElementById('cat_description').value = '';
            }
        });
    }
});

// Event delegation for category delete buttons
window.attachCategoryListeners = function (container) {
    if (!container) return;

    container.querySelectorAll('.category-delete-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const categoryId = parseInt(this.dataset.categoryId);
            const categoryName = this.dataset.categoryName;

            if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) return;

            try {
                const response = await fetch(`/api/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                if (response.ok) {
                    showSuccess('Category deleted successfully');
                    if (window.loadCategories) window.loadCategories();
                } else {
                    const error = await response.json();
                    showError('Error: ' + error.error);
                }
            } catch (error) {
                showError('Error deleting category');
            }
        });
    });

    console.log('Category listeners attached');
};
