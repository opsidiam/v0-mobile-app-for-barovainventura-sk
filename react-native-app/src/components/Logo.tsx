import { Platform, Image, View } from "react-native"
import { SvgUri } from "react-native-svg"

interface LogoProps {
    width: number
    height: number
    url?: string
}

export function Logo({ width, height, url }: LogoProps) {
    const logoUrl = url || (Platform.OS === "web"
        ? "https://barovainventura.sk/img/V1%20alt%20-%20W.svg"
        : "https://barovainventura.sk/img/V1%20-%20Icon%20-%20W.svg")

    if (Platform.OS === "web") {
        return (
            <Image
                source={{ uri: logoUrl }}
                style={{ width, height, resizeMode: "contain" }}
            />
        )
    }

    return (
        <SvgUri
            width={width}
            height={height}
            uri={logoUrl}
        />
    )
}
