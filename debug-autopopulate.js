// Debug script for auto-populate functionality
// Add this script tag to booking.html temporarily: <script src="debug-autopopulate.js"></script>

console.log('🔧 DEBUG: Auto-populate debug script loaded');

// Override console.log to also display on page
const originalLog = console.log;
const debugMessages = [];

console.log = function(...args) {
    originalLog.apply(console, args);
    debugMessages.push(args.join(' '));
    updateDebugDisplay();
};

function updateDebugDisplay() {
    let debugDiv = document.getElementById('debug-display');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug-display';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            max-height: 400px;
            overflow-y: auto;
            background: rgba(0,0,0,0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            border: 2px solid #333;
        `;
        document.body.appendChild(debugDiv);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: red;
            color: white;
            border: none;
            width: 20px;
            height: 20px;
            cursor: pointer;
            border-radius: 3px;
        `;
        closeBtn.onclick = () => debugDiv.style.display = 'none';
        debugDiv.appendChild(closeBtn);
    }
    
    debugDiv.innerHTML = `
        <button onclick="this.parentNode.style.display='none'" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; width: 20px; height: 20px; cursor: pointer; border-radius: 3px;">✕</button>
        <div style="margin-top: 25px;">
            <strong>🔧 AUTO-POPULATE DEBUG</strong><br><br>
            ${debugMessages.slice(-20).map(msg => `<div style="margin: 2px 0; padding: 2px; background: rgba(255,255,255,0.1);">${msg}</div>`).join('')}
        </div>
    `;
}

// Test function you can call from browser console
window.testAutoPopulate = function() {
    console.log('🧪 MANUAL TEST: Starting auto-populate test');
    
    // Check URL
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    
    console.log(`🌐 Current URL: ${url}`);
    console.log(`📋 URL Params: ${urlParams.toString()}`);
    console.log(`🎯 Service Param: ${serviceParam}`);
    
    // Check elements
    const serviceSelect = document.getElementById('service');
    console.log(`📝 Service Select Element: ${serviceSelect ? 'FOUND' : 'NOT FOUND'}`);
    
    if (serviceSelect) {
        console.log(`🔍 Service Select Value: "${serviceSelect.value}"`);
        console.log(`📊 Total Options: ${serviceSelect.options.length}`);
        
        // List all options
        for (let i = 0; i < serviceSelect.options.length; i++) {
            const option = serviceSelect.options[i];
            console.log(`  Option ${i}: value="${option.value}" text="${option.textContent}"`);
        }
        
        if (serviceParam) {
            const targetOption = serviceSelect.querySelector(`option[value="${serviceParam}"]`);
            console.log(`🎯 Target Option Found: ${targetOption ? 'YES' : 'NO'}`);
            
            if (targetOption) {
                console.log(`✅ SETTING SERVICE: ${serviceParam}`);
                serviceSelect.value = serviceParam;
                serviceSelect.style.background = 'yellow';
                serviceSelect.style.border = '3px solid red';
                
                // Trigger change event
                serviceSelect.dispatchEvent(new Event('change'));
                console.log(`🔄 Change event triggered`);
                
                // Verify the selection worked
                setTimeout(() => {
                    console.log(`🔍 VERIFICATION: Current dropdown value is "${serviceSelect.value}"`);
                    console.log(`🔍 VERIFICATION: Selected text is "${serviceSelect.options[serviceSelect.selectedIndex].text}"`);
                    
                    if (serviceSelect.value === serviceParam) {
                        console.log(`🎉 SUCCESS: Service is properly selected!`);
                        
                        // Make it really obvious
                        serviceSelect.style.background = '#00ff00';
                        serviceSelect.style.fontSize = '18px';
                        serviceSelect.style.fontWeight = 'bold';
                        
                        // Show success message
                        alert(`✅ SUCCESS!\n\nService auto-populated: ${serviceSelect.options[serviceSelect.selectedIndex].text}`);
                    } else {
                        console.log(`❌ FAILED: Service not selected properly`);
                    }
                }, 100);
            }
        }
    }
};

// Auto-run test when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DEBUG: DOMContentLoaded fired');
    setTimeout(() => {
        console.log('🕐 DEBUG: Running auto-test after 500ms delay');
        window.testAutoPopulate();
    }, 500);
});

window.addEventListener('load', function() {
    console.log('🌟 DEBUG: Window load fired');
});

// Add test buttons to page
setTimeout(() => {
    if (document.body) {
        const testPanel = document.createElement('div');
        testPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #3A7D99;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
        `;
        testPanel.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>🧪 Debug Tools</strong></div>
            <button onclick="window.testAutoPopulate()" style="margin: 2px; padding: 5px;">Test Auto-populate</button><br>
            <button onclick="window.location.href='booking.html?service=mindful-start'" style="margin: 2px; padding: 5px;">Test Mindful Start</button><br>
            <button onclick="window.location.href='booking.html?service=integrated-massage'" style="margin: 2px; padding: 5px;">Test Integrated</button><br>
            <button onclick="document.getElementById('debug-display').style.display='block'" style="margin: 2px; padding: 5px;">Show Debug</button>
        `;
        document.body.appendChild(testPanel);
    }
}, 1000);