import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'

export function PriceRegisterSearchInput({ value, onChange }) {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue)
            }
        }, 300)
        return () => clearTimeout(handler)
    }, [localValue, value, onChange])

    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search by name, code, description, or type..."
                className="pl-8 w-full md:w-90"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
            />
        </div>
    )
}
