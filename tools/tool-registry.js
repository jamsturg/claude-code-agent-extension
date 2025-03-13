/**
 * Registry for system tools
 * Manages tool registration, discovery, and access
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map(); // Maps toolName -> toolInstance
    this.logger = console; // Replace with structured logger in production
  }

  /**
   * Register a tool in the registry
   * @param {Object} tool - Tool implementation
   */
  registerTool(tool) {
    if (!tool || typeof tool.getName !== 'function' || typeof tool.execute !== 'function') {
      throw new Error('Invalid tool implementation: must have getName() and execute() methods');
    }

    const toolName = tool.getName();
    
    if (this.tools.has(toolName)) {
      this.logger.warn(`Tool ${toolName} already registered, overwriting`);
    }
    
    this.tools.set(toolName, tool);
    this.logger.debug(`Registered tool: ${toolName}`);
  }

  /**
   * Get a tool by name
   * @param {string} name - Tool name
   * @returns {Object} Tool instance
   */
  getTool(name) {
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    
    return tool;
  }

  /**
   * Check if a tool exists
   * @param {string} name - Tool name
   * @returns {boolean} Whether the tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Get names of all registered tools
   * @returns {string[]} Tool names
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get information about all registered tools
   * @returns {Object[]} Tool information
   */
  getToolInfo() {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.getDescription ? tool.getDescription() : undefined
    }));
  }
}

module.exports = ToolRegistry;