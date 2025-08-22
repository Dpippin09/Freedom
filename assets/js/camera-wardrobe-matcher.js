class CameraWardrobeMatcher {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.currentMode = 'outfit';
        this.isInitialized = false;
        this.aiAnalyzer = null;
        
        this.init();
    }

    async init() {
        console.log('📷 Initializing Camera Wardrobe Matcher...');
        
        // Wait for AI system to be available
        if (window.StyleVectorAnalyzer) {
            this.aiAnalyzer = new window.StyleVectorAnalyzer();
            await this.aiAnalyzer.initialize();
        }
        
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ Camera Wardrobe Matcher initialized');
    }

    setupEventListeners() {
        // Mode selector buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeMode(e.target.dataset.mode);
            });
        });

        // Camera control buttons
        const startBtn = document.getElementById('startCamera');
        const captureBtn = document.getElementById('capturePhoto');
        const retakeBtn = document.getElementById('retakePhoto');
        const analyzeBtn = document.getElementById('analyzePhoto');
        
        if (startBtn) startBtn.addEventListener('click', () => this.startCamera());
        if (captureBtn) captureBtn.addEventListener('click', () => this.capturePhoto());
        if (retakeBtn) retakeBtn.addEventListener('click', () => this.retakePhoto());
        if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.analyzePhoto());

        // File upload
        const fileInput = document.getElementById('photoUpload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    }

    changeMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update guide text
        this.updateGuideText();
    }

    updateGuideText() {
        const guide = document.querySelector('.camera-guide');
        if (!guide) return;

        const guides = {
            outfit: {
                title: '👗 Full Outfit Analysis',
                text: 'Capture your complete outfit for styling suggestions and compatibility analysis'
            },
            item: {
                title: '👔 Single Item Focus',
                text: 'Focus on one clothing item for detailed analysis and matching recommendations'
            },
            color: {
                title: '🎨 Color Matching',
                text: 'Capture colors to find matching items and create harmonious combinations'
            },
            occasion: {
                title: '🎯 Occasion Styling',
                text: 'Get outfit suggestions tailored to specific events and occasions'
            }
        };

        const currentGuide = guides[this.currentMode];
        guide.querySelector('h3').textContent = currentGuide.title;
        guide.querySelector('p').textContent = currentGuide.text;
    }

    async startCamera() {
        try {
            console.log('📱 Starting camera...');
            this.showLoading('Starting camera...');

            // Request camera permissions
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });

            this.video = document.getElementById('cameraVideo');
            if (this.video) {
                this.video.srcObject = this.stream;
                this.video.play();
                
                // Show camera controls
                document.getElementById('startCamera').style.display = 'none';
                document.getElementById('capturePhoto').style.display = 'inline-flex';
                
                this.hideLoading();
                console.log('✅ Camera started successfully');
            }
        } catch (error) {
            console.error('❌ Camera error:', error);
            this.hideLoading();
            this.showError('Unable to access camera. Please check permissions or try uploading a photo instead.');
        }
    }

    capturePhoto() {
        if (!this.video || !this.stream) return;

        console.log('📸 Capturing photo...');

        // Create canvas to capture frame
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Draw current video frame to canvas
        this.context.drawImage(this.video, 0, 0);
        
        // Convert to blob and display
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.displayCapturedPhoto(url, blob);
        }, 'image/jpeg', 0.8);

        // Update UI
        document.getElementById('capturePhoto').style.display = 'none';
        document.getElementById('retakePhoto').style.display = 'inline-flex';
        document.getElementById('analyzePhoto').style.display = 'inline-flex';
    }

    retakePhoto() {
        console.log('🔄 Retaking photo...');
        
        // Hide preview and show camera again
        const preview = document.querySelector('.photo-preview');
        if (preview) preview.classList.remove('show');
        
        // Reset buttons
        document.getElementById('retakePhoto').style.display = 'none';
        document.getElementById('analyzePhoto').style.display = 'none';
        document.getElementById('capturePhoto').style.display = 'inline-flex';
        
        // Hide any previous analysis
        this.hideAnalysis();
    }

    displayCapturedPhoto(url, blob) {
        const preview = document.querySelector('.photo-preview');
        const img = document.querySelector('.preview-image');
        
        if (preview && img) {
            img.src = url;
            preview.classList.add('show');
            
            // Store blob for analysis
            this.currentPhotoBlob = blob;
        }

        // Stop camera stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📁 File uploaded:', file.name);

        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file.');
            return;
        }

        const url = URL.createObjectURL(file);
        this.displayCapturedPhoto(url, file);
        
        // Update UI for uploaded photo
        document.getElementById('startCamera').style.display = 'none';
        document.getElementById('capturePhoto').style.display = 'none';
        document.getElementById('retakePhoto').style.display = 'inline-flex';
        document.getElementById('analyzePhoto').style.display = 'inline-flex';
    }

    async analyzePhoto() {
        if (!this.currentPhotoBlob) {
            this.showError('No photo to analyze.');
            return;
        }

        console.log('🧠 Starting AI analysis...');
        this.showLoading('Analyzing your photo with AI...');

        try {
            // Convert image to base64 for analysis
            const base64 = await this.blobToBase64(this.currentPhotoBlob);
            
            // Simulate AI analysis based on current mode
            const analysisResult = await this.performAIAnalysis(base64);
            
            this.hideLoading();
            this.displayAnalysisResults(analysisResult);
            
            // Generate recommendations
            const recommendations = await this.generateRecommendations(analysisResult);
            this.displayRecommendations(recommendations);
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.hideLoading();
            this.showError('Unable to analyze photo. Please try again.');
        }
    }

    async performAIAnalysis(imageBase64) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock analysis based on current mode
        const mockAnalysis = {
            outfit: {
                colors: {
                    primary: ['Navy Blue', 'White'],
                    secondary: ['Silver', 'Light Gray'],
                    accent: ['Red']
                },
                style: {
                    category: 'Business Casual',
                    formality: 'Semi-formal',
                    season: 'All seasons'
                },
                items: [
                    { type: 'Blazer', color: 'Navy Blue', fit: 'Tailored' },
                    { type: 'Shirt', color: 'White', pattern: 'Solid' },
                    { type: 'Trousers', color: 'Light Gray', fit: 'Slim' }
                ],
                compatibility: 85,
                suggestions: [
                    'Add a statement watch for professional touch',
                    'Consider brown leather shoes for warmth',
                    'A subtle pattern tie would add visual interest'
                ]
            },
            item: {
                type: 'Dress Shirt',
                colors: ['White', 'Light Blue'],
                pattern: 'Solid',
                fabric: 'Cotton',
                fit: 'Regular',
                style: 'Business',
                versatility: 92,
                occasions: ['Work', 'Business meetings', 'Semi-formal events']
            },
            color: {
                dominant: '#1a237e',
                palette: ['#1a237e', '#ffffff', '#f5f5f5', '#424242'],
                harmony: 'Monochromatic',
                mood: 'Professional, Trustworthy',
                matching_colors: ['Gray', 'Charcoal', 'Cream', 'Light Pink']
            },
            occasion: {
                detected: 'Business Meeting',
                confidence: 78,
                appropriate: true,
                suggestions: [
                    'Perfect for professional settings',
                    'Consider adding a blazer for extra formality',
                    'Neutral colors work well for business'
                ]
            }
        };

        return mockAnalysis[this.currentMode];
    }

    async generateRecommendations(analysisResult) {
        // Simulate API call to get matching products
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockRecommendations = [
            {
                title: 'Navy Blue Blazer',
                price: '$89.99',
                store: 'Zara',
                image: 'https://via.placeholder.com/200x250/1a237e/ffffff?text=Navy+Blazer',
                compatibility: 95
            },
            {
                title: 'Brown Leather Shoes',
                price: '$129.99',
                store: 'Target',
                image: 'https://via.placeholder.com/200x250/8d6e63/ffffff?text=Brown+Shoes',
                compatibility: 88
            },
            {
                title: 'Silver Watch',
                price: '$45.99',
                store: 'Amazon',
                image: 'https://via.placeholder.com/200x250/9e9e9e/ffffff?text=Silver+Watch',
                compatibility: 82
            },
            {
                title: 'Silk Tie',
                price: '$24.99',
                store: 'Walmart',
                image: 'https://via.placeholder.com/200x250/d32f2f/ffffff?text=Red+Tie',
                compatibility: 90
            }
        ];

        return mockRecommendations;
    }

    displayAnalysisResults(result) {
        const analysisDiv = document.querySelector('.ai-analysis');
        if (!analysisDiv) return;

        let content = '';

        if (this.currentMode === 'outfit') {
            content = `
                <div class="analysis-card">
                    <h4>🎨 Color Analysis</h4>
                    <p>Primary colors: ${result.colors.primary.join(', ')}</p>
                    <p>Secondary colors: ${result.colors.secondary.join(', ')}</p>
                    <div class="analysis-tags">
                        ${result.colors.primary.map(color => `<span class="analysis-tag">${color}</span>`).join('')}
                    </div>
                </div>
                <div class="analysis-card">
                    <h4>👔 Style Profile</h4>
                    <p>Category: ${result.style.category}</p>
                    <p>Formality: ${result.style.formality}</p>
                    <p>Season: ${result.style.season}</p>
                </div>
                <div class="analysis-card">
                    <h4>📊 Compatibility Score</h4>
                    <p>Overall outfit harmony: ${result.compatibility}%</p>
                    <div style="background: #e9ecef; border-radius: 10px; height: 8px; margin: 10px 0;">
                        <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${result.compatibility}%; border-radius: 10px;"></div>
                    </div>
                </div>
                <div class="analysis-card">
                    <h4>💡 Suggestions</h4>
                    ${result.suggestions.map(suggestion => `<p>• ${suggestion}</p>`).join('')}
                </div>
            `;
        } else if (this.currentMode === 'item') {
            content = `
                <div class="analysis-card">
                    <h4>👕 Item Details</h4>
                    <p>Type: ${result.type}</p>
                    <p>Colors: ${result.colors.join(', ')}</p>
                    <p>Pattern: ${result.pattern}</p>
                    <p>Fabric: ${result.fabric}</p>
                </div>
                <div class="analysis-card">
                    <h4>📈 Versatility Score</h4>
                    <p>Versatility rating: ${result.versatility}%</p>
                    <div style="background: #e9ecef; border-radius: 10px; height: 8px; margin: 10px 0;">
                        <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${result.versatility}%; border-radius: 10px;"></div>
                    </div>
                </div>
                <div class="analysis-card">
                    <h4>🎯 Best Occasions</h4>
                    <div class="analysis-tags">
                        ${result.occasions.map(occasion => `<span class="analysis-tag">${occasion}</span>`).join('')}
                    </div>
                </div>
            `;
        } else if (this.currentMode === 'color') {
            content = `
                <div class="analysis-card">
                    <h4>🎨 Color Palette</h4>
                    <div style="display: flex; gap: 10px; margin: 10px 0;">
                        ${result.palette.map(color => `<div style="width: 30px; height: 30px; background: ${color}; border-radius: 50%; border: 2px solid #ddd;"></div>`).join('')}
                    </div>
                    <p>Harmony type: ${result.harmony}</p>
                </div>
                <div class="analysis-card">
                    <h4>🧠 Color Psychology</h4>
                    <p>Mood: ${result.mood}</p>
                </div>
                <div class="analysis-card">
                    <h4>🎯 Matching Colors</h4>
                    <div class="analysis-tags">
                        ${result.matching_colors.map(color => `<span class="analysis-tag">${color}</span>`).join('')}
                    </div>
                </div>
            `;
        } else if (this.currentMode === 'occasion') {
            content = `
                <div class="analysis-card">
                    <h4>🎯 Occasion Analysis</h4>
                    <p>Detected occasion: ${result.detected}</p>
                    <p>Confidence: ${result.confidence}%</p>
                    <p>Appropriateness: ${result.appropriate ? '✅ Appropriate' : '❌ Needs adjustment'}</p>
                </div>
                <div class="analysis-card">
                    <h4>💡 Occasion Tips</h4>
                    ${result.suggestions.map(suggestion => `<p>• ${suggestion}</p>`).join('')}
                </div>
            `;
        }

        analysisDiv.innerHTML = `<h3>🧠 AI Analysis Results</h3><div class="analysis-grid">${content}</div>`;
        analysisDiv.classList.add('show');
    }

    displayRecommendations(recommendations) {
        const recDiv = document.querySelector('.recommendations');
        if (!recDiv) return;

        const content = recommendations.map(item => `
            <div class="recommendation-card" data-store="${item.store}">
                <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/200x250/764ba2/ffffff?text=Product'">
                <h4>${item.title}</h4>
                <p>${item.price} - ${item.store}</p>
                <div style="background: #e9ecef; border-radius: 10px; height: 6px; margin: 10px 0;">
                    <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${item.compatibility}%; border-radius: 10px;"></div>
                </div>
                <small>${item.compatibility}% match</small>
            </div>
        `).join('');

        recDiv.innerHTML = `<h3>🛍️ Recommended Items</h3><div class="recommendation-grid">${content}</div>`;
        recDiv.classList.add('show');

        // Add click handlers for recommendations
        recDiv.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', () => {
                const store = card.dataset.store;
                console.log(`🛒 Opening ${store} search...`);
                // Could integrate with existing search functionality
            });
        });
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    showLoading(message) {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.querySelector('p').textContent = message;
            loading.classList.add('show');
        }
    }

    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.classList.remove('show');
        }
    }

    hideAnalysis() {
        const analysis = document.querySelector('.ai-analysis');
        const recommendations = document.querySelector('.recommendations');
        
        if (analysis) analysis.classList.remove('show');
        if (recommendations) recommendations.classList.remove('show');
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #f5c6cb;
            `;
            document.querySelector('.camera-interface').appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 5000);
    }

    // Check if camera is supported
    static isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Check if device is mobile
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.camera-wardrobe-container')) {
        window.cameraWardrobe = new CameraWardrobeMatcher();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraWardrobeMatcher;
}