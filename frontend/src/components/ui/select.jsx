"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const SelectRoot = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
})
SelectRoot.displayName = "SelectRoot"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <optgroup ref={ref} className={className} {...props}>
    {children}
  </optgroup>
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, value, children, ...props }, ref) => (
  <option ref={ref} value={value} className={className} {...props}>
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props}>
    {children}
  </div>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, placeholder, children, ...props }, ref) => (
  <span ref={ref} className={cn("text-sm", className)} {...props}>
    {children || placeholder}
  </span>
))
SelectValue.displayName = "SelectValue"

export {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
