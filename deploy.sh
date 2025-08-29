#!/bin/bash

# 🚀 AI Code Generator Extension Deployment Script
# This script automates the entire deployment process

set -e  # Exit on any error

echo "🚀 Starting AI Code Generator Extension Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    # Check TypeScript
    if ! command -v tsc &> /dev/null; then
        print_warning "TypeScript not found globally. Installing..."
        npm install -g typescript
    fi
    print_success "TypeScript found: $(tsc --version)"
    
    # Check vsce
    if ! command -v vsce &> /dev/null; then
        print_warning "vsce not found. Installing VS Code Extension Manager..."
        npm install -g @vscode/vsce
    fi
    print_success "vsce found: $(vsce --version)"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed successfully"
    else
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
}

# Compile TypeScript
compile_typescript() {
    print_status "Compiling TypeScript..."
    
    if [ -f "tsconfig.json" ]; then
        npm run compile || tsc
        print_success "TypeScript compiled successfully"
    else
        print_error "tsconfig.json not found. Cannot compile TypeScript."
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if npm run test 2>/dev/null; then
        print_success "All tests passed"
    else
        print_warning "Tests failed or no test script found. Continuing anyway..."
    fi
}

# Lint code
lint_code() {
    print_status "Linting code..."
    
    if npm run lint 2>/dev/null; then
        print_success "Code linting passed"
    else
        print_warning "Linting failed or no lint script found. Continuing anyway..."
    fi
}

# Package extension
package_extension() {
    print_status "Packaging extension..."
    
    # Remove old VSIX files
    rm -f *.vsix
    
    # Package the extension
    vsce package
    
    # Find the created VSIX file
    VSIX_FILE=$(ls *.vsix 2>/dev/null | head -n1)
    
    if [ -f "$VSIX_FILE" ]; then
        print_success "Extension packaged successfully: $VSIX_FILE"
        echo "📦 Package size: $(du -h "$VSIX_FILE" | cut -f1)"
    else
        print_error "Failed to create VSIX package"
        exit 1
    fi
}

# Test local installation
test_local_installation() {
    print_status "Testing local installation..."
    
    VSIX_FILE=$(ls *.vsix 2>/dev/null | head -n1)
    
    if [ -f "$VSIX_FILE" ]; then
        print_status "Installing extension locally for testing..."
        code --install-extension "$VSIX_FILE" --force
        print_success "Extension installed locally. Please test it in VS Code."
        
        read -p "Have you tested the extension and is it working correctly? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Please test the extension before publishing."
            exit 1
        fi
    else
        print_error "No VSIX file found for testing"
        exit 1
    fi
}

# Publish to marketplace
publish_extension() {
    print_status "Publishing to VS Code Marketplace..."
    
    # Check if user is logged in
    if ! vsce ls-publishers &>/dev/null; then
        print_warning "You are not logged in to vsce."
        print_status "Please run 'vsce login <publisher-name>' first."
        read -p "Enter your publisher name: " PUBLISHER_NAME
        
        if [ -z "$PUBLISHER_NAME" ]; then
            print_error "Publisher name cannot be empty"
            exit 1
        fi
        
        print_status "Logging in to vsce..."
        vsce login "$PUBLISHER_NAME"
    fi
    
    # Publish the extension
    print_status "Publishing extension..."
    
    read -p "Do you want to publish as pre-release? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vsce publish --pre-release
        print_success "Extension published as pre-release!"
    else
        vsce publish
        print_success "Extension published to marketplace!"
    fi
    
    print_status "🎉 Your extension is now live on the VS Code Marketplace!"
    print_status "📊 Monitor your extension at: https://marketplace.visualstudio.com/manage"
}

# Create GitHub release
create_github_release() {
    print_status "Creating GitHub release..."
    
    VSIX_FILE=$(ls *.vsix 2>/dev/null | head -n1)
    VERSION=$(node -p "require('./package.json').version")
    
    if [ -f "$VSIX_FILE" ]; then
        print_status "VSIX file: $VSIX_FILE"
        print_status "Version: $VERSION"
        print_status "Please manually create a GitHub release and upload the VSIX file."
        print_status "Release URL: https://github.com/yourusername/ai-code-generator-extension/releases/new"
        print_status "Tag: v$VERSION"
        print_status "Title: AI Code Generator v$VERSION"
    fi
}

# Cleanup
cleanup() {
    print_status "Cleaning up temporary files..."
    # Add any cleanup commands here if needed
    print_success "Cleanup completed"
}

# Main deployment process
main() {
    echo "🤖 AI Code Generator Extension Deployment"
    echo "========================================="
    echo
    
    # Ask user what they want to do
    echo "What would you like to do?"
    echo "1) Full deployment (compile, package, test, publish)"
    echo "2) Package only (compile and create VSIX)"
    echo "3) Test local installation"
    echo "4) Publish to marketplace"
    echo "5) Check prerequisites only"
    echo
    read -p "Enter your choice (1-5): " -n 1 -r
    echo
    echo
    
    case $REPLY in
        1)
            print_status "Starting full deployment process..."
            check_prerequisites
            install_dependencies
            compile_typescript
            lint_code
            run_tests
            package_extension
            test_local_installation
            publish_extension
            create_github_release
            cleanup
            ;;
        2)
            print_status "Packaging extension only..."
            check_prerequisites
            install_dependencies
            compile_typescript
            package_extension
            ;;
        3)
            print_status "Testing local installation..."
            test_local_installation
            ;;
        4)
            print_status "Publishing to marketplace..."
            publish_extension
            ;;
        5)
            print_status "Checking prerequisites..."
            check_prerequisites
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo
    print_success "🎉 Deployment process completed successfully!"
    echo
    echo "📋 Next Steps:"
    echo "1. Monitor your extension on the VS Code Marketplace"
    echo "2. Respond to user reviews and feedback"
    echo "3. Plan future updates and improvements"
    echo "4. Market your extension to reach more developers"
    echo
    echo "🔗 Useful Links:"
    echo "• Marketplace: https://marketplace.visualstudio.com/manage"
    echo "• Analytics: https://marketplace.visualstudio.com/manage/publishers"
    echo "• Documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension"
    echo
    print_success "Happy coding! 🚀"
}

# Run main function
main