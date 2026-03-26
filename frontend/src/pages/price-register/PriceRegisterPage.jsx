import { Tags } from 'lucide-react'
import { PriceRegisterTable } from '../../components/price-register/PriceRegisterTable'

export function PriceRegisterPage() {
    return (
        <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-400 mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Tags className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Price Register</h1>
                        <p className="text-sm text-muted-foreground">
                            Pre-define item prices for FF&E and OFCI records
                        </p>
                    </div>
                </div>
            </div>

            <PriceRegisterTable />
        </div>
    )
}
