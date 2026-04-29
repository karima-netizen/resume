// ================================
// CVBuilder Pro - Core JavaScript
// Dependencies: html2canvas, jspdf (already loaded via CDN)
// ================================

// Global state
let currentTemplate = 'modern';   // 'modern', 'creative', 'minimalist', 'elegant', 'bold', 'corporate'

// Helper: Hash-based routing to support browser Back button
function showPage(id) {
    window.location.hash = id;
}

function renderPageFromHash() {
    const id = window.location.hash.replace('#', '') || 'landing';
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    } else {
        document.getElementById('landing').classList.remove('hidden');
    }
    
    // If we open the editor, re-apply template styles and refresh preview
    if (id === 'editor' || id === 'dashboard') {
        applyTemplateToPreview();
        updatePreview();   // sync all data
    }
}

// Listen for browser back/forward buttons
window.addEventListener('hashchange', renderPageFromHash);

// ========== MOCK AUTH & PAYMENT ==========
function updateNav() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        document.getElementById('nav-actions-logged-out').classList.add('hidden');
        document.getElementById('nav-actions-logged-in').classList.remove('hidden');
    } else {
        document.getElementById('nav-actions-logged-out').classList.remove('hidden');
        document.getElementById('nav-actions-logged-in').classList.add('hidden');
    }
}

function login() {
    const email = document.getElementById('email').value.trim();
    const pwd = document.getElementById('password').value.trim();
    if (!email || !pwd) {
        alert("✨ Demo: Please enter any email & password to continue");
        return;
    }
    // Set login state
    localStorage.setItem('isLoggedIn', 'true');
    updateNav();
    
    // Check if user has already paid
    if (localStorage.getItem('hasPaid') === 'true') {
        showPage('dashboard');
    } else {
        showPage('payment');
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    updateNav();
    showPage('landing');
}

// ========== PAYPAL INTEGRATION ==========
// Initialize PayPal buttons if the SDK is loaded
if (window.paypal) {
    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        },
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: "CVBuilder Pro Lifetime Access",
                    amount: {
                        value: '30.00' // Updated price
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                // Successful payment
                localStorage.setItem('hasPaid', 'true');
                alert('Merci ' + details.payer.name.given_name + '! Votre paiement a été effectué avec succès.');
                showPage('dashboard');
            });
        },
        onError: function(err) {
            console.error('PayPal Error:', err);
            alert('Une erreur est survenue lors du paiement via PayPal.');
        }
    }).render('#paypal-button-container');
}

// ========== TEMPLATE SELECTION ==========
function selectTemplate(template) {
    currentTemplate = template;
    showPage('editor');
    applyTemplateToPreview();
    updatePreview();
}

// Apply visual template classes to the CV container
function applyTemplateToPreview() {
    const cvDiv = document.getElementById('cv-container');
    if (!cvDiv) return;
    cvDiv.className = 'cv-paper';
    cvDiv.classList.add('template-' + currentTemplate);
}

// ========== COLOR CUSTOMIZATION ==========
function updateThemeColor() {
    const color = document.getElementById('theme-color').value;
    const cvDiv = document.getElementById('cv-container');
    if (cvDiv) {
        cvDiv.style.setProperty('--cv-theme', color);
    }
}

// ========== LIVE PREVIEW UPDATE ==========
// Helper: convert newlines to <br> for multiline fields
function formatMultiline(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}

// Simple XSS protection
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updatePreview() {
    // Get input values
    const name = document.getElementById('in-name').value.trim();
    const job = document.getElementById('in-job').value.trim();
    const email = document.getElementById('in-email').value.trim();
    const phone = document.getElementById('in-phone').value.trim();
    let aboutText = document.getElementById('in-about').value;
    let skillsText = document.getElementById('in-skills').value;
    let expText = document.getElementById('in-experience').value;
    let eduText = document.getElementById('in-education').value;

    // Update name and title
    document.getElementById('out-name').innerText = name || 'Alex Johnson';
    document.getElementById('out-job').innerText = job || 'Senior Product Designer';
    
    // Contact info
    document.getElementById('out-email').innerHTML = email ? `📧 ${escapeHtml(email)}` : '📧 alex@design.com';
    document.getElementById('out-phone').innerHTML = phone ? `📞 ${escapeHtml(phone)}` : '📞 +1 234 567 890';
    
    // Summary
    const aboutDefault = "Creative professional with a user-centric mindset, passionate about building impactful digital experiences.";
    document.getElementById('out-about').innerHTML = aboutText ? formatMultiline(escapeHtml(aboutText)) : aboutDefault;
    
    // Skills (comma separated becomes readable)
    const skillsDefault = "UI/UX Design, Figma, Product Strategy, Communication, Agile";
    if (skillsText.trim() !== '') {
        let skillsFormatted = escapeHtml(skillsText).replace(/,/g, ', ');
        document.getElementById('out-skills').innerHTML = skillsFormatted;
    } else {
        document.getElementById('out-skills').innerHTML = skillsDefault;
    }

    // Experience (multi-line)
    const expDefault = "• Led cross-functional teams to deliver high impact solutions\n• Spearheaded redesign increasing conversion by 27%";
    if (expText.trim() !== '') {
        document.getElementById('out-experience').innerHTML = formatMultiline(escapeHtml(expText));
    } else {
        document.getElementById('out-experience').innerHTML = expDefault.replace(/\n/g, '<br>');
    }

    // Education (multi-line)
    const eduDefault = "B.Sc. in Computer Science, University of Technology\nCertified Product Manager";
    if (eduText.trim() !== '') {
        document.getElementById('out-education').innerHTML = formatMultiline(escapeHtml(eduText));
    } else {
        document.getElementById('out-education').innerHTML = eduDefault.replace(/\n/g, '<br>');
    }
}

// ========== PDF EXPORT ==========
async function downloadPDF() {
    const btn = document.getElementById('pdfDownloadBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Generating PDF...';
    btn.disabled = true;
    btn.classList.add('btn-loading');

    try {
        const element = document.getElementById('cv-container');
        if (!element) throw new Error('Preview not found');
        
        // Render the CV container at high resolution
        const canvas = await html2canvas(element, {
            scale: 2.5,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        });
        
        const imgWidth = 190; // mm (A4 width minus margins)
        const pageHeight = 277; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let position = 10; // top margin
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        let heightLeft = imgHeight - (pageHeight - position);
        
        // Add extra pages if content overflows
        if (heightLeft > 0) {
            let currentPosition = position;
            let remainingHeight = imgHeight;
            while (remainingHeight > (pageHeight - currentPosition)) {
                pdf.addPage();
                const nextStart = 10;
                const nextImgY = - (currentPosition + (pageHeight - currentPosition));
                pdf.addImage(imgData, 'PNG', 10, nextImgY, imgWidth, imgHeight);
                remainingHeight -= (pageHeight - currentPosition);
                currentPosition = 10;
            }
        }
        
        pdf.save('CVBuilder_Resume.pdf');
    } catch (error) {
        console.error(error);
        alert('PDF generation error. Please try again or screenshot your resume.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('btn-loading');
    }
}

// ========== INITIAL DATA & EVENT BINDING ==========
function setDefaultFormValues() {
    document.getElementById('in-name').value = 'Alex Johnson';
    document.getElementById('in-job').value = 'Senior Product Designer';
    document.getElementById('in-email').value = 'alex.johnson@cvpro.com';
    document.getElementById('in-phone').value = '+1 (415) 867-5309';
    document.getElementById('in-about').value = 'Innovative product designer with 8+ years of experience crafting human-centered digital experiences. Passionate about design systems and user research.';
    document.getElementById('in-skills').value = 'Figma, Adobe XD, User Research, Prototyping, Design Thinking, HTML/CSS';
    document.getElementById('in-experience').value = '• Lead Product Designer, TechFlow (2021–Present): Redesigned core platform, increased retention by 34%\n• UI/UX Designer, CreativeLabs (2018–2021): Launched 3 mobile apps with 500k+ downloads\n• Freelance Designer (2016–2018): Worked with 12+ startups';
    document.getElementById('in-education').value = 'MSc in Human-Computer Interaction, University of Washington\nB.A. in Graphic Design, California College of Arts';
    updatePreview();
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setDefaultFormValues();
    currentTemplate = 'modern';
    const cvDiv = document.getElementById('cv-container');
    if (cvDiv) {
        cvDiv.classList.add('template-modern');
    }
    renderPageFromHash();
    updateNav();
});

// Expose necessary functions to global scope (for inline onclick handlers)
window.showPage = showPage;
window.login = login;
window.fakePayment = fakePayment;
window.selectTemplate = selectTemplate;
window.updatePreview = updatePreview;
window.updateThemeColor = updateThemeColor;
window.logout = logout;
window.downloadPDF = downloadPDF;
